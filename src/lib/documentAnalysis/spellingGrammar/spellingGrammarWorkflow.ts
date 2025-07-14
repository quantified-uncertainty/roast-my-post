import type { Agent } from "../../../types/agentSchema";
import type { Document } from "../../../types/documents";
import type { Comment } from "../../../types/documentSchema";
import type { TaskResult } from "../shared/types";
import { analyzeChunk } from "./analyzeChunk";
import { convertHighlightsToComments } from "./highlightConverter";
import type { ChunkWithLineNumbers, SpellingGrammarHighlight } from "./types";
import { getDocumentFullContent } from "../../../utils/documentContentHelpers";
import { logger } from "@/lib/logger";
import { ANALYSIS_MODEL } from "../../../types/openai";
import { detectDocumentConventions } from "./detectConventions";
import { postProcessErrors, createConsolidatedComment, calculateSmartGrade } from "./postProcessing";
import type { ProcessedResults, ErrorGroup } from "./postProcessing";
import { calculateCost, mapModelToCostModel } from "@/utils/costCalculator";
import { splitIntoChunks, getCharacterOffsetForLine, getErrorGroupEmoji, getErrorTypeLabel } from "./utils";
import type { DocumentConventions } from "./detectConventions";


/**
 * Complete spelling and grammar analysis workflow
 * Note: targetHighlights is ignored - all errors are returned for spelling/grammar
 */
export async function analyzeSpellingGrammarDocument(
  document: Document,
  agentInfo: Agent,
  targetHighlights?: number // Optional, ignored for spelling/grammar
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
  const allHighlights: SpellingGrammarHighlight[] = [];
  const startTime = Date.now();
  
  try {
    // Get the full document content
    const { content: fullContent } = getDocumentFullContent(document);
    
    // Handle empty documents
    if (!fullContent.trim()) {
      logger.info("Document is empty, no analysis needed");
      return {
        thinking: "",
        analysis: "## Spelling & Grammar Analysis\n\nThe document is empty.",
        summary: "No spelling or grammar errors detected.",
        grade: 100,
        selfCritique: undefined,
        highlights: [],
        tasks: []
      };
    }
    
    // Stage 1: Detect document conventions
    logger.info("Stage 1: Detecting document conventions");
    const conventions = await detectDocumentConventions(fullContent);
    logger.info(`Detected conventions: ${conventions.language} English, ${conventions.documentType} document`);
    
    tasks.push({
      name: "Detect document conventions",
      modelName: ANALYSIS_MODEL,
      priceInDollars: 0,
      timeInSeconds: (Date.now() - startTime) / 1000,
      log: `Detected ${conventions.language} English, ${conventions.documentType} document type, ${conventions.formality} formality. Document has ${fullContent.split(/\s+/).length} words across ${fullContent.split('\n').length} lines.`,
      llmInteractions: []
    });
    
    // Stage 2: Analyze chunks with convention context
    // Split into chunks
    const chunks = splitIntoChunks(fullContent);
    logger.info(`Stage 2: Analyzing ${chunks.length} chunks for spelling/grammar errors`);
    
    // Analyze each chunk
    const chunkStartTime = Date.now();
    const chunkPromises = chunks.map(async (chunk, i) => {
      logger.info(`Analyzing chunk ${i + 1}/${chunks.length}`, {
        chunk: {
          index: i + 1,
          totalChunks: chunks.length,
          lineRange: `${chunk.startLineNumber}-${chunk.startLineNumber + chunk.lines.length - 1}`,
          characters: chunk.content.length,
          preview: chunk.content.substring(0, 100).replace(/\n/g, ' ') + (chunk.content.length > 100 ? '...' : '')
        }
      });
      
      const result = await analyzeChunk(chunk, {
        agentName: agentInfo.name,
        primaryInstructions: agentInfo.primaryInstructions || "Find all spelling, grammar, punctuation, and capitalization errors.",
        conventions: {
          language: conventions.language,
          documentType: conventions.documentType,
          formality: conventions.formality
        }
      });
      
      logger.info(`Found ${result.highlights.length} errors in chunk ${i + 1}`, {
        chunk: {
          index: i + 1,
          lines: `${chunk.startLineNumber}-${chunk.startLineNumber + chunk.lines.length - 1}`,
          charactersProcessed: chunk.content.length,
          errorsFound: result.highlights.length,
          errorTypes: result.highlights.reduce((acc, h) => {
            const type = h.description.toLowerCase().includes('spelling') ? 'spelling' :
                         h.description.toLowerCase().includes('grammar') ? 'grammar' :
                         h.description.toLowerCase().includes('punctuation') ? 'punctuation' :
                         h.description.toLowerCase().includes('capitalization') ? 'capitalization' :
                         'other';
            acc[type] = (acc[type] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
          usage: result.usage ? {
            inputTokens: result.usage.input_tokens,
            outputTokens: result.usage.output_tokens
          } : null
        }
      });
      
      return {
        chunkIndex: i,
        highlights: result.highlights,
        usage: result.usage
      };
    });
    
    // Wait for all chunks to complete
    const chunkResults = await Promise.all(chunkPromises);
    
    // Collect all highlights, usage data, and create tasks
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    
    chunkResults.forEach(({ chunkIndex, highlights, usage }) => {
      allHighlights.push(...highlights);
      
      // Track token usage if available
      if (usage) {
        const inputTokens = usage.input_tokens || 0;
        const outputTokens = usage.output_tokens || 0;
        totalInputTokens += inputTokens;
        totalOutputTokens += outputTokens;
        logger.debug(`Chunk ${chunkIndex + 1} token usage: ${inputTokens} input, ${outputTokens} output`);
      } else {
        logger.warn(`No usage data for chunk ${chunkIndex + 1}`);
      }
      
      // Calculate cost for this chunk if we have usage data
      let chunkCost = 0;
      if (usage) {
        try {
          const costModel = mapModelToCostModel(ANALYSIS_MODEL);
          const costResult = calculateCost(costModel, usage.input_tokens || 0, usage.output_tokens || 0);
          chunkCost = costResult.totalCost; // Already in dollars
        } catch (e) {
          // Ignore cost calculation errors
        }
      }
      
      // Create detailed log with error types
      const errorTypes = highlights.reduce((acc, h) => {
        const type = h.description.toLowerCase().includes('spelling') ? 'spelling' :
                     h.description.toLowerCase().includes('grammar') ? 'grammar' :
                     h.description.toLowerCase().includes('punctuation') ? 'punctuation' :
                     h.description.toLowerCase().includes('capitalization') ? 'capitalization' :
                     'other';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const errorSummary = Object.entries(errorTypes)
        .map(([type, count]) => `${count} ${type}`)
        .join(', ');
      
      logger.info(`Chunk ${chunkIndex + 1} cost: $${chunkCost.toFixed(8)}`);
      
      tasks.push({
        name: `Analyze chunk ${chunkIndex + 1}`,
        modelName: ANALYSIS_MODEL,
        priceInDollars: chunkCost,
        timeInSeconds: (Date.now() - chunkStartTime) / 1000,
        log: `Analyzed chunk ${chunkIndex + 1} (lines ${chunks[chunkIndex].startLineNumber}-${chunks[chunkIndex].startLineNumber + chunks[chunkIndex].lines.length - 1}): ${highlights.length} errors found${errorSummary ? ` (${errorSummary})` : ''}`,
        llmInteractions: []
      });
    });
    
    // Stage 3: Post-process and deduplicate errors
    logger.info("Stage 3: Post-processing and deduplicating errors", {
      totalHighlightsBeforeProcessing: allHighlights.length,
      uniqueErrors: new Set(allHighlights.map(h => h.highlightedText)).size
    });
    const postProcessingStartTime = Date.now();
    
    const processedResults = postProcessErrors(allHighlights, conventions);
    
    logger.info("Post-processing complete", {
      uniqueErrorsFound: processedResults.uniqueErrorCount,
      totalOccurrences: processedResults.totalErrorCount,
      consolidatedGroups: processedResults.consolidatedErrors.length,
      hasConventionIssues: !!processedResults.conventionIssues,
      duration: `${Date.now() - postProcessingStartTime}ms`
    });
    
    // Create detailed error type breakdown for the log
    const errorTypeBreakdown = processedResults.consolidatedErrors.reduce((acc: Record<string, number>, group: ErrorGroup) => {
      acc[group.errorType] = (acc[group.errorType] || 0) + group.count;
      return acc;
    }, {} as Record<string, number>);
    
    const errorBreakdownStr = Object.entries(errorTypeBreakdown)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .map(([type, count]) => `${count} ${type}`)
      .join(', ');
    
    const severityBreakdown = processedResults.consolidatedErrors.reduce((acc: Record<string, number>, group: ErrorGroup) => {
      acc[group.severity] = (acc[group.severity] || 0) + group.count;
      return acc;
    }, {} as Record<string, number>);
    
    const severityStr = Object.entries(severityBreakdown)
      .map(([sev, count]) => `${count} ${sev}`)
      .join(', ');
    
    tasks.push({
      name: "Post-process and deduplicate errors",
      modelName: ANALYSIS_MODEL,
      priceInDollars: 0,
      timeInSeconds: (Date.now() - postProcessingStartTime) / 1000,
      log: `Consolidated ${processedResults.totalErrorCount} errors into ${processedResults.uniqueErrorCount} unique groups. Types: ${errorBreakdownStr}. Severity: ${severityStr}.${processedResults.conventionIssues ? ` Convention issue: ${processedResults.conventionIssues.description}` : ''}`,
      llmInteractions: []
    });
    
    // Convert consolidated errors to comments
    const comments: Comment[] = [];
    
    // Add convention warning if needed
    if (processedResults.conventionIssues) {
      comments.push({
        description: `🔄 Consistency: ${processedResults.conventionIssues.description}`,
        importance: 9,
        grade: 10,
        highlight: {
          startOffset: 0,
          endOffset: 50, // Just highlight the beginning
          quotedText: fullContent.slice(0, 50) + "...",
          isValid: true
        },
        isValid: true
      });
    }
    
    // Convert error groups to comments
    for (const errorGroup of processedResults.consolidatedErrors) {
      for (const highlight of errorGroup.examples.slice(0, errorGroup.count > 2 ? 1 : errorGroup.count)) {
        // Calculate the character offset for the start of the line
        const lineStartOffset = getCharacterOffsetForLine(fullContent, highlight.lineStart);
        
        // Get the content of the lines involved in this highlight
        const lines = fullContent.split('\n');
        const highlightLines = lines.slice(highlight.lineStart - 1, highlight.lineEnd);
        const highlightContent = highlightLines.join('\n');
        
        // Convert to comments using relative line numbers
        const relativeHighlight: SpellingGrammarHighlight = {
          ...highlight,
          lineStart: 1,
          lineEnd: highlight.lineEnd - highlight.lineStart + 1,
          // Add count info to description if it's a consolidated error
          description: errorGroup.count > 2 
            ? `${highlight.description} (Found ${errorGroup.count} times throughout document)`
            : highlight.description
        };
        
        const chunkComments = convertHighlightsToComments(
          [relativeHighlight],
          highlightContent,
          lineStartOffset
        );
        
        // Adjust importance and grade based on severity and frequency
        chunkComments.forEach(comment => {
          comment.importance = errorGroup.severity === 'high' ? 8 : 
                              errorGroup.severity === 'medium' ? 5 : 3;
          comment.grade = errorGroup.severity === 'high' ? 20 : 
                         errorGroup.severity === 'medium' ? 40 : 60;
          // Comments from postProcessing already have emoji format
          // Only add if not already formatted (check for emoji at start)
          const startsWithEmoji = /^[\u{1F300}-\u{1F9FF}]|^[\u{2600}-\u{27BF}]/u.test(comment.description);
          if (!startsWithEmoji) {
            const emoji = getErrorGroupEmoji(errorGroup);
            const typeLabel = getErrorTypeLabel(errorGroup.errorType);
            comment.description = `${emoji} ${typeLabel}: ${comment.description}`;
          }
        });
        
        comments.push(...chunkComments);
      }
    }
    
    // Sort comments by position in document
    comments.sort((a, b) => a.highlight.startOffset - b.highlight.startOffset);
    
    // For spelling/grammar, we should show all errors, not limit by targetHighlights
    // Users need to see all spelling and grammar mistakes to fix them
    const finalHighlights = comments;
    
    // Generate analysis and summary with smart scoring
    const { content } = getDocumentFullContent(document);
    const wordCount = content.split(/\s+/).length;
    const grade = calculateSmartGrade(processedResults, wordCount);
    
    const analysis = generateSmartAnalysis(
      processedResults,
      wordCount,
      grade,
      conventions
    );
    
    const summary = processedResults.uniqueErrorCount === 0 
      ? "No spelling or grammar errors detected."
      : `Found ${processedResults.uniqueErrorCount} unique error${processedResults.uniqueErrorCount === 1 ? '' : 's'} (${processedResults.totalErrorCount} total occurrence${processedResults.totalErrorCount === 1 ? '' : 's'}).`;
    
    // Calculate comprehensive stats for logging
    const errorsByType: Record<string, number> = {};
    const errorsBySeverity: Record<string, number> = { high: 0, medium: 0, low: 0 };
    
    processedResults.consolidatedErrors.forEach((group: ErrorGroup) => {
      errorsByType[group.errorType] = (errorsByType[group.errorType] || 0) + group.count;
      errorsBySeverity[group.severity] += group.count;
    });
    
    // Calculate cost
    let totalCost = 0;
    try {
      const costModel = mapModelToCostModel(ANALYSIS_MODEL);
      const costResult = calculateCost(costModel, totalInputTokens, totalOutputTokens);
      totalCost = costResult.totalCost;
      logger.info(`Cost calculation: ${totalInputTokens} input + ${totalOutputTokens} output tokens = $${totalCost.toFixed(6)} (model: ${costModel})`);
    } catch (e) {
      logger.warn("Could not calculate cost", { error: e, model: ANALYSIS_MODEL, inputTokens: totalInputTokens, outputTokens: totalOutputTokens });
    }
    
    // Log comprehensive analysis results
    logger.info("Spelling/grammar analysis complete", {
      document: {
        id: document.id,
        title: document.title || "Untitled",
        wordCount,
        characterCount: content.length,
        language: conventions.language,
        formality: conventions.formality,
        documentType: conventions.documentType
      },
      results: {
        uniqueErrors: processedResults.uniqueErrorCount,
        totalOccurrences: processedResults.totalErrorCount,
        errorDensity: (processedResults.uniqueErrorCount / (wordCount / 100)).toFixed(2),
        grade,
        hasConventionIssues: !!processedResults.conventionIssues
      },
      errorBreakdown: {
        byType: errorsByType,
        bySeverity: errorsBySeverity
      },
      comments: {
        total: comments.length,
        samples: comments.slice(0, 3).map(c => ({
          description: c.description.substring(0, 100) + (c.description.length > 100 ? "..." : ""),
          importance: c.importance,
          grade: c.grade
        }))
      },
      conventionIssues: processedResults.conventionIssues ? {
        description: processedResults.conventionIssues.description,
        examples: processedResults.conventionIssues.examples
      } : null,
      performance: {
        duration: `${Date.now() - startTime}ms`,
        chunksProcessed: chunks.length,
        tokens: {
          input: totalInputTokens,
          output: totalOutputTokens,
          total: totalInputTokens + totalOutputTokens
        },
        cost: {
          totalUSD: totalCost.toFixed(4),
          totalCents: (totalCost * 100).toFixed(4),
          model: ANALYSIS_MODEL
        }
      }
    });
    
    // Update task costs with proper distribution
    const chunksWithCosts = tasks.filter(t => t.name.startsWith('Analyze chunk'));
    
    // Update chunk task costs if we calculated them, otherwise distribute equally
    if (chunksWithCosts.some(t => t.priceInDollars > 0)) {
      // Individual chunk costs were calculated, no need to redistribute
    } else if (chunksWithCosts.length > 0) {
      // Distribute total cost equally among chunks
      const costPerChunk = totalCost / chunksWithCosts.length;
      chunksWithCosts.forEach(task => {
        task.priceInDollars = costPerChunk;
      });
    }
    
    return {
      thinking: "", // No thinking step for spelling/grammar
      analysis,
      summary,
      grade,
      selfCritique: undefined, // No self-critique for spelling/grammar
      highlights: finalHighlights,
      tasks
    };
  } catch (error) {
    logger.error("Error in spelling/grammar analysis workflow:", error);
    throw error;
  }
}

/**
 * Generate smart analysis based on processed results
 */
function generateSmartAnalysis(
  processedResults: ProcessedResults,
  wordCount: number,
  grade: number,
  conventions: DocumentConventions
): string {
  // Categorize unique errors by type
  const errorTypeBreakdown: Record<string, number> = {};
  processedResults.consolidatedErrors.forEach((group: ErrorGroup) => {
    errorTypeBreakdown[group.errorType] = (errorTypeBreakdown[group.errorType] || 0) + 1;
  });
  
  const errorDensity = processedResults.uniqueErrorCount / (wordCount / 100);
  
  const analysis = `## Spelling & Grammar Analysis

This document was analyzed for spelling, grammar, punctuation, and capitalization errors.

### Document Profile
- **Document Type:** ${conventions.documentType}
- **Language Convention:** ${conventions.language} English
- **Formality Level:** ${conventions.formality}

### Error Summary
- **Unique Errors Found:** ${processedResults.uniqueErrorCount}
- **Total Occurrences:** ${processedResults.totalErrorCount}
- **Document Length:** ~${Math.round(wordCount / 10) * 10} words
- **Error Density:** ${errorDensity.toFixed(2)} unique errors per 100 words

### Error Breakdown by Type
${Object.entries(errorTypeBreakdown)
  .sort(([,a], [,b]) => b - a)
  .map(([type, count]) => `- **${type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ')}:** ${count} unique error${count === 1 ? '' : 's'}`)
  .join('\n')}

${processedResults.conventionIssues ? `### Convention Issues
⚠️ ${processedResults.conventionIssues.description}
Examples: ${processedResults.conventionIssues.examples.join(', ')}

` : ''}### Document Quality Score

Based on the unique error density and severity, this document receives a **${grade}%** quality score for spelling and grammar.

${grade >= 95 ? '**✅ Excellent!** Very few errors found - professional quality writing.' : 
  grade >= 85 ? '**Good job!** Minor errors that don\'t significantly impact readability.' :
  grade >= 75 ? '**Needs improvement.** Several errors affect the document\'s quality.' :
  grade >= 65 ? '**Significant issues.** Many errors detract from professionalism.' :
  '**Major problems.** Extensive errors severely impact readability.'}

### Most Common Issues
${processedResults.consolidatedErrors.slice(0, 3).map((group: ErrorGroup, i: number) => {
  const emoji = getErrorGroupEmoji(group);
  return `${i + 1}. ${emoji} **${group.baseError}** - ${group.count} occurrence${group.count === 1 ? '' : 's'}`;
}).join('\n')}

### Error Severity Legend
- 🔴 **Critical spelling errors** - Must be fixed
- ❌ **Grammar errors** - Affect sentence structure
- ⚠️ **Wrong word choice** - Incorrect word usage
- 🔤 **Capitalization** - Case errors
- 📍 **Punctuation placement** - Missing or misplaced
- 🔄 **Consistency issues** - Mixed conventions
- 💭 **Minor spacing** - Low priority formatting
- 💡 **Style suggestions** - Optional improvements`;

  return analysis;
}