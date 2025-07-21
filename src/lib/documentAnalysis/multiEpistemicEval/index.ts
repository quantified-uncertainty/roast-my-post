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
  MathPlugin,
  SimpleAnalysisPlugin
} from '../plugin-system';
import type { LLMInteraction } from "../../../types/llm";
import { getDocumentFullContent } from "../../../utils/documentContentHelpers";
import type { HeliconeSessionConfig } from "../../helicone/sessions";


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
    
    // TODO: Re-enable other plugins after they're updated to new architecture
    const plugins: SimpleAnalysisPlugin[] = [
      new MathPlugin(),
      // new SpellingPlugin(),  // Disabled - needs refactor
      // new FactCheckPlugin()  // Disabled - needs refactor
    ];
    
    // Get full document content with prepend (same as comprehensive analysis)
    const { content: fullContent, prependLineCount } = getDocumentFullContent(document);
    
    // Run analysis on full content using new API
    const pluginResults = await manager.analyzeDocumentSimple(fullContent, plugins);
    
    const pluginDuration = Date.now() - pluginStartTime;
    logger.info(`Plugin analysis completed in ${pluginDuration}ms`);
    
    // Collect LLM interactions from all plugins
    const allLLMInteractions: LLMInteraction[] = [];
    for (const [pluginName, result] of pluginResults.pluginResults) {
      allLLMInteractions.push(...result.llmInteractions);
    }
    
    tasks.push({
      name: 'Plugin Analysis',
      modelName: 'claude-3-5-sonnet-20241022', // Update to current model
      priceInDollars: pluginResults.statistics.totalCost,
      timeInSeconds: pluginDuration / 1000,
      log: `Analyzed ${pluginResults.statistics.totalChunks} chunks, generated ${pluginResults.statistics.totalComments} comments using ${plugins.length} plugins.`,
      llmInteractions: allLLMInteractions
    });
    
    // Step 2: Plugin results are ready
    logger.info(`Plugin analysis completed: ${pluginResults.statistics.totalComments} comments generated`);
    
    // Step 3: Use summary and analysis from plugin results
    const { summary, analysis } = pluginResults;
    
    // Step 4: Get highlights from plugin results
    logger.info(`Converting plugin comments to highlights...`);
    const highlights: Comment[] = pluginResults.allComments;
    
    // Log comment counts by plugin
    for (const [pluginName, count] of pluginResults.statistics.commentsByPlugin.entries()) {
      logger.info(`${pluginName} plugin generated ${count} comments`);
    }
    
    logger.info(`Total highlights from plugins: ${highlights.length}`);
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
      highlights: uniqueHighlights,
      tasks
    };
    
  } catch (error) {
    logger.error("Multi-epistemic evaluation failed:", error);
    throw error;
  }
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