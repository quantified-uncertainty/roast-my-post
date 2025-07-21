/**
 * Multi-Epistemic Evaluation workflow for document analysis
 */

import type { Agent } from "../../../types/agentSchema";
import type { Document } from "../../../types/documents";
import type { Comment } from "../../../types/documentSchema";
import type { TaskResult } from "../shared/types";
import { logger } from "@/lib/logger";
import { 
  PluginManager,
  MathPlugin
} from '../plugin-system';
import { generateSelfCritique } from "../selfCritique";
import type { SelfCritiqueInput } from "../selfCritique";
import type { RichLLMInteraction, LLMInteraction } from "../../../types/llm";
import { getDocumentFullContent } from "../../../utils/documentContentHelpers";
import type { HeliconeSessionConfig } from "../../helicone/sessions";

/**
 * Convert RichLLMInteraction to LLMInteraction format for TaskResult
 */
function convertRichLLMInteraction(richInteraction: RichLLMInteraction): LLMInteraction {
  return {
    messages: [
      { role: "system", content: richInteraction.prompt.split('\n\nUSER: ')[0].replace('SYSTEM: ', '') },
      { role: "user", content: richInteraction.prompt.split('\n\nUSER: ')[1] || richInteraction.prompt },
      { role: "assistant", content: richInteraction.response }
    ],
    usage: {
      input_tokens: richInteraction.tokensUsed.prompt,
      output_tokens: richInteraction.tokensUsed.completion
    }
  };
}

export async function analyzeWithMultiEpistemicEval(
  document: Document,
  agentInfo: Agent,
  options: {
    targetHighlights?: number;
    sessionConfig?: HeliconeSessionConfig;
  } = {}
): Promise<{
  thinking: string;
  analysis: string;
  summary: string;
  grade?: number;
  selfCritique?: string;
  highlights: Comment[];
  tasks: TaskResult[];
}> {
  const tasks: TaskResult[] = [];
  const targetHighlights = options.targetHighlights || 5;
  
  try {
    // Step 1: Run plugin-based analysis
    logger.info(`Starting multi-epistemic evaluation...`);
    const pluginStartTime = Date.now();
    
    const manager = new PluginManager({
      sessionConfig: options.sessionConfig
    });
    
    // Register plugins
    // TODO: Re-enable other plugins after they're updated to new architecture
    const plugins: any[] = [
      new MathPlugin(),
      // new SpellingPlugin(),  // Disabled - needs refactor
      // new FactCheckPlugin()  // Disabled - needs refactor
    ];
    
    manager.registerPlugins(plugins);
    
    // Get full document content with prepend (same as comprehensive analysis)
    const { content: fullContent, prependLineCount } = getDocumentFullContent(document);
    
    // Run analysis on full content
    const pluginResults = await manager.analyzeDocument(fullContent, {
      chunkSize: 1000,
      chunkByParagraphs: true
    });
    
    const pluginDuration = Date.now() - pluginStartTime;
    logger.info(`Plugin analysis completed in ${pluginDuration}ms`);
    
    // Get router LLM interactions for accurate tracking
    const routerInteractions = manager.getRouterLLMInteractions();
    const routerTokens = routerInteractions.reduce((sum, interaction) => sum + interaction.tokensUsed.total, 0);
    
    tasks.push({
      name: 'Plugin Analysis',
      modelName: 'claude-3-haiku-20240307',
      priceInDollars: pluginResults.statistics.tokensUsed * 0.00000025, // Approximate cost based on total tokens
      timeInSeconds: pluginDuration / 1000,
      log: `Analyzed ${pluginResults.statistics.totalChunks} chunks, generated ${pluginResults.statistics.totalComments} comments. Router used ${routerTokens} tokens in ${routerInteractions.length} routing calls.`,
      llmInteractions: routerInteractions.map(convertRichLLMInteraction)
    });
    
    // Step 2: Plugin results are ready
    logger.info(`Plugin analysis completed: ${pluginResults.statistics.totalComments} comments generated`);
    
    // Step 3: Generate summary and analysis from plugin results
    const { summary, analysis } = generatePluginSummary(pluginResults);
    
    // Step 4: Convert plugin comments directly to highlights
    logger.info(`Converting plugin comments to highlights...`);
    const highlights: Comment[] = [];
    
    // Collect all comments from plugins
    if (pluginResults.pluginComments instanceof Map) {
      for (const [pluginName, comments] of pluginResults.pluginComments.entries()) {
        logger.info(`${pluginName} plugin generated ${comments.length} comments`);
        highlights.push(...comments);
      }
    }
    
    logger.info(`Total highlights from plugins: ${highlights.length}`);
    
    // Step 5: Generate self-critique if enabled
    let selfCritique: string | undefined;
    if (agentInfo.selfCritiqueInstructions) {
      logger.info(`Generating self-critique...`);
      try {
        const critiqueInput: SelfCritiqueInput = {
          summary: summary,
          analysis: analysis,
          grade: undefined, // Plugins don't provide grades yet
          highlights: highlights.map((h) => ({
            title: h.description || "Highlight",
            text: h.highlight.quotedText
          }))
        };
        const critiqueResult = await generateSelfCritique(critiqueInput, agentInfo);
        selfCritique = critiqueResult.outputs.selfCritique;
        tasks.push(critiqueResult.task);
      } catch (error) {
        logger.error("Self-critique generation failed:", error);
        tasks.push({
          name: 'Self-Critique',
          modelName: 'claude-3-sonnet-20241022',
          priceInDollars: 0.005,
          timeInSeconds: 5,
          log: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          llmInteractions: []
        });
      }
    }
    
    // Deduplicate highlights that might overlap
    const uniqueHighlights = deduplicateHighlights(highlights);
    
    logger.info(
      `Final highlights: ${uniqueHighlights.length}`
    );
    
    return {
      thinking: "", // Plugin analysis doesn't provide thinking
      analysis: analysis,
      summary: summary,
      grade: undefined, // Plugins don't provide grades yet
      selfCritique,
      highlights: uniqueHighlights,
      tasks
    };
    
  } catch (error) {
    logger.error("Multi-epistemic evaluation failed:", error);
    throw error;
  }
}

/**
 * Generate summary and analysis from plugin results
 */
function generatePluginSummary(results: any): { summary: string; analysis: string } {
  const sections: string[] = [];
  
  // Overall statistics
  sections.push(`**Document Analysis Summary**`);
  const pluginCount = results.statistics.commentsByPlugin?.size || 0;
  sections.push(`This document was analyzed by ${pluginCount} specialized plugins that examined ${results.statistics.totalChunks} sections.`);
  
  // Plugin-specific summaries and key findings
  if (results.pluginResults instanceof Map) {
    for (const [pluginName, pluginResult] of results.pluginResults.entries()) {
      if (pluginResult.summary) {
        sections.push(`\n**${pluginName} Analysis:**`);
        sections.push(pluginResult.summary);
        
        if (pluginResult.analysisSummary) {
          sections.push(`\n${pluginResult.analysisSummary}`);
        }
      }
    }
  }
  
  // Summary based on comment importance
  const highImportanceCount = countHighImportanceComments(results);
  const mediumImportanceCount = countMediumImportanceComments(results);
  
  if (highImportanceCount > 0) {
    sections.push(`\n**Critical Issues:** ${highImportanceCount} high-importance issues were identified that require immediate attention.`);
  }
  
  if (mediumImportanceCount > 0) {
    sections.push(`**Notable Concerns:** ${mediumImportanceCount} medium-importance issues were found that should be addressed.`);
  }
  
  const analysis = sections.join('\n');
  
  // Generate concise summary
  const summary = `Analysis identified ${results.statistics.totalComments} issues across ${results.statistics.totalChunks} sections. ` +
    (highImportanceCount > 0 ? `${highImportanceCount} critical issues require immediate attention. ` : '') +
    (mediumImportanceCount > 0 ? `${mediumImportanceCount} notable concerns should be addressed.` : '');
  
  return { summary: summary.trim(), analysis };
}

/**
 * Count medium importance comments
 */
function countMediumImportanceComments(results: any): number {
  let count = 0;
  if (results.pluginComments instanceof Map) {
    for (const [_, comments] of results.pluginComments.entries()) {
      count += comments.filter((c: Comment) => c.importance !== undefined && c.importance >= 4 && c.importance < 7).length;
    }
  }
  return count;
}


/**
 * Count high importance comments
 */
function countHighImportanceComments(results: any): number {
  let count = 0;
  if (results.pluginComments instanceof Map) {
    for (const [_, comments] of results.pluginComments.entries()) {
      count += comments.filter((c: Comment) => c.importance !== undefined && c.importance >= 7).length;
    }
  }
  return count;
}

/**
 * Deduplicate highlights based on overlapping positions
 */
function deduplicateHighlights(highlights: Comment[]): Comment[] {
  if (highlights.length <= 1) return highlights;
  
  // Sort by start offset
  const sorted = [...highlights].sort((a, b) => 
    a.highlight.startOffset - b.highlight.startOffset
  );
  
  const unique: Comment[] = [];
  
  for (const highlight of sorted) {
    // Check if this highlight overlaps with any existing unique highlight
    const overlaps = unique.some(existing => {
      const existingStart = existing.highlight.startOffset;
      const existingEnd = existing.highlight.endOffset;
      const currentStart = highlight.highlight.startOffset;
      const currentEnd = highlight.highlight.endOffset;
      
      // Check for overlap (fixed off-by-one error)
      return (currentStart >= existingStart && currentStart < existingEnd) ||
             (currentEnd > existingStart && currentEnd <= existingEnd) ||
             (currentStart < existingStart && currentEnd > existingEnd);
    });
    
    if (!overlaps) {
      unique.push(highlight);
    }
  }
  
  return unique;
}