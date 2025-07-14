import type { Agent } from "../../../types/agentSchema";
import type { Document } from "../../../types/documents";
import type { Comment } from "../../../types/documentSchema";
import type { TaskResult } from "../shared/types";
import { analyzeChunk } from "./analyzeChunk";
import { convertHighlightsToComments } from "./highlightConverter";
import type { ChunkWithLineNumbers, SpellingGrammarHighlight, TokenUsage, LLMInteraction } from "./types";
import { getDocumentFullContent } from "../../../utils/documentContentHelpers";
import { logger } from "@/lib/logger";
import { splitIntoChunks, getCharacterOffsetForLine } from "./utils";
import { 
  EMPTY_DOCUMENT_RESPONSE, 
  DEFAULT_CHUNK_SIZE,
  CONCURRENT_CHUNK_LIMIT,
  API_STAGGER_DELAY_MS,
  LOG_PREFIXES
} from "./constants";
import { ANALYSIS_MODEL } from "../../../types/openai";
import { calculateCost, mapModelToCostModel } from "@/utils/costCalculator";

/**
 * Complete spelling and grammar analysis workflow with PARALLEL chunk processing
 */
export async function analyzeSpellingGrammarDocumentParallel(
  document: Document,
  agentInfo: Agent,
  targetHighlights?: number, // Ignored for spelling/grammar
  maxConcurrency: number = CONCURRENT_CHUNK_LIMIT
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
  
  try {
    // Get the full document content
    const { content: fullContent } = getDocumentFullContent(document);
    
    // Handle empty documents
    if (!fullContent.trim()) {
      logger.info(`${LOG_PREFIXES.WORKFLOW} Document is empty, no analysis needed`);
      return EMPTY_DOCUMENT_RESPONSE;
    }
    
    // Split into chunks
    const chunks = splitIntoChunks(fullContent, DEFAULT_CHUNK_SIZE);
    logger.info(`Split document into ${chunks.length} chunks for parallel spelling/grammar analysis`);
    
    // Process chunks in parallel with concurrency limit
    const startTime = Date.now();
    const chunkPromises: Promise<{
      chunkIndex: number;
      chunk: ChunkWithLineNumbers;
      highlights: SpellingGrammarHighlight[];
      duration: number;
      usage?: TokenUsage;
      llmInteraction?: LLMInteraction;
    }>[] = [];
    
    // Process chunks in batches
    for (let i = 0; i < chunks.length; i += maxConcurrency) {
      const batch = chunks.slice(i, Math.min(i + maxConcurrency, chunks.length));
      const batchStartTime = Date.now();
      
      const batchPromises = batch.map(async (chunk, batchIndex) => {
        const chunkIndex = i + batchIndex;
        const chunkStartTime = Date.now();
        
        // Add a small staggered delay to avoid overwhelming the API
        const staggerDelay = batchIndex * API_STAGGER_DELAY_MS;
        if (staggerDelay > 0) {
          await new Promise(resolve => setTimeout(resolve, staggerDelay));
        }
        
        logger.info(`Analyzing chunk ${chunkIndex + 1}/${chunks.length} (lines ${chunk.startLineNumber}-${chunk.startLineNumber + chunk.lines.length - 1})`);
        
        try {
          const result = await analyzeChunk(chunk, {
            agentName: agentInfo.name,
            primaryInstructions: agentInfo.primaryInstructions || "Find all spelling, grammar, punctuation, and capitalization errors."
          });
          
          const duration = Date.now() - chunkStartTime;
          logger.info(`Found ${result.highlights.length} errors in chunk ${chunkIndex + 1} (${duration}ms)`);
          
          return {
            chunkIndex,
            chunk,
            highlights: result.highlights,
            duration,
            usage: result.usage,
            llmInteraction: result.llmInteraction
          };
        } catch (error) {
          logger.error(`Error analyzing chunk ${chunkIndex + 1}:`, error);
          return {
            chunkIndex,
            chunk,
            highlights: [],
            duration: Date.now() - chunkStartTime
          };
        }
      });
      
      // Wait for this batch to complete before starting the next
      const batchResults = await Promise.all(batchPromises);
      chunkPromises.push(...batchResults.map(r => Promise.resolve(r)));
      
      logger.info(`Completed batch ${Math.floor(i / maxConcurrency) + 1}/${Math.ceil(chunks.length / maxConcurrency)} in ${Date.now() - batchStartTime}ms`);
    }
    
    // Wait for all chunks to complete
    const chunkResults = await Promise.all(chunkPromises);
    
    // Sort results by chunk index to maintain order
    chunkResults.sort((a, b) => a.chunkIndex - b.chunkIndex);
    
    // Aggregate highlights and create tasks
    const allHighlights: SpellingGrammarHighlight[] = [];
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    
    for (const result of chunkResults) {
      allHighlights.push(...result.highlights);
      
      // Calculate cost for this chunk
      let chunkCost = 0;
      if (result.usage) {
        totalInputTokens += result.usage.input_tokens || 0;
        totalOutputTokens += result.usage.output_tokens || 0;
        try {
          const costModel = mapModelToCostModel(ANALYSIS_MODEL);
          const costResult = calculateCost(costModel, result.usage.input_tokens || 0, result.usage.output_tokens || 0);
          chunkCost = costResult.totalCost;
        } catch (e) {
          logger.warn(`Could not calculate cost for chunk ${result.chunkIndex + 1}`, { error: e });
        }
      }
      
      tasks.push({
        name: `Analyze chunk ${result.chunkIndex + 1}`,
        modelName: ANALYSIS_MODEL,
        priceInDollars: chunkCost,
        timeInSeconds: result.duration / 1000,
        log: `Analyzed chunk ${result.chunkIndex + 1}: ${result.highlights.length} errors found`,
        llmInteractions: result.llmInteraction ? [result.llmInteraction] : []
      });
    }
    
    // Convert all highlights to comments with proper character offsets
    const comments: Comment[] = [];
    for (const highlight of allHighlights) {
      // Calculate the character offset for the start of the line
      const lineStartOffset = getCharacterOffsetForLine(fullContent, highlight.lineStart);
      
      // Get the content of the lines involved in this highlight
      const lines = fullContent.split('\n');
      const highlightLines = lines.slice(highlight.lineStart - 1, highlight.lineEnd);
      const highlightContent = highlightLines.join('\n');
      
      // Convert to comments using relative line numbers (1-based within the highlight content)
      const relativeHighlight: SpellingGrammarHighlight = {
        ...highlight,
        lineStart: 1,
        lineEnd: highlight.lineEnd - highlight.lineStart + 1
      };
      
      const chunkComments = convertHighlightsToComments(
        [relativeHighlight],
        highlightContent,
        lineStartOffset
      );
      
      comments.push(...chunkComments);
    }
    
    // Sort comments by position in document
    comments.sort((a, b) => a.highlight.startOffset - b.highlight.startOffset);
    
    // For spelling/grammar, we return all errors (ignore targetHighlights)
    const finalHighlights = comments;
    
    // Generate analysis and summary
    const { analysis, summary, grade } = generateSpellingGrammarAnalysis(
      document,
      allHighlights,
      chunks.length,
      Date.now() - startTime
    );
    
    logger.info(`Parallel spelling/grammar analysis complete: ${allHighlights.length} total errors found in ${Date.now() - startTime}ms`);
    
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
    logger.error("Error in parallel spelling/grammar analysis workflow:", error);
    throw error;
  }
}

/**
 * Generate analysis and summary from spelling/grammar results
 */
function generateSpellingGrammarAnalysis(
  document: Document,
  highlights: SpellingGrammarHighlight[],
  chunkCount: number,
  totalDuration: number
): { analysis: string; summary: string; grade: number } {
  // Categorize errors
  const errorTypes = {
    spelling: 0,
    grammar: 0,
    punctuation: 0,
    capitalization: 0
  };
  
  highlights.forEach(highlight => {
    const desc = highlight.description.toLowerCase();
    if (desc.includes('spelling') || desc.includes('misspell')) {
      errorTypes.spelling++;
    } else if (desc.includes('punctuation') || desc.includes('comma') || desc.includes('period')) {
      errorTypes.punctuation++;
    } else if (desc.includes('capital')) {
      errorTypes.capitalization++;
    } else {
      errorTypes.grammar++;
    }
  });
  
  // Calculate grade based on error density
  const { content } = getDocumentFullContent(document);
  const wordCount = content.split(/\s+/).length;
  const errorDensity = highlights.length / wordCount;
  
  // Grade calculation: Start at 100 and subtract based on error density
  // 1 error per 100 words = -10 points
  const grade = Math.max(0, Math.round(100 - (errorDensity * 1000)));
  
  const analysis = `## Spelling & Grammar Analysis

This document was analyzed for spelling, grammar, punctuation, and capitalization errors.

### Error Summary
- **Total Errors Found:** ${highlights.length}
- **Document Length:** ~${Math.round(wordCount / 10) * 10} words
- **Error Rate:** ${(errorDensity * 100).toFixed(2)} errors per 100 words
- **Processing Time:** ${(totalDuration / 1000).toFixed(1)}s (${chunkCount} chunks processed in parallel)

### Error Breakdown
${errorTypes.spelling > 0 ? `- **Spelling Errors:** ${errorTypes.spelling}\n` : ''}${errorTypes.grammar > 0 ? `- **Grammar Errors:** ${errorTypes.grammar}\n` : ''}${errorTypes.punctuation > 0 ? `- **Punctuation Errors:** ${errorTypes.punctuation}\n` : ''}${errorTypes.capitalization > 0 ? `- **Capitalization Errors:** ${errorTypes.capitalization}\n` : ''}
### Document Quality Score

Based on the error density, this document receives a **${grade}%** quality score for spelling and grammar.

${highlights.length === 0 ? '**✅ Excellent!** No spelling or grammar errors were detected.' : 
  highlights.length < 5 ? '**Good job!** Only a few minor errors were found.' :
  highlights.length < 15 ? '**Needs improvement.** Several errors affect readability.' :
  '**Significant issues.** Many errors detract from the document\'s professionalism.'}`;

  const summary = highlights.length === 0 
    ? "No spelling or grammar errors detected."
    : `Found ${highlights.length} spelling/grammar error${highlights.length === 1 ? '' : 's'} across ${chunkCount} chunk${chunkCount === 1 ? '' : 's'} (${(totalDuration / 1000).toFixed(1)}s).`;

  return { analysis, summary, grade };
}