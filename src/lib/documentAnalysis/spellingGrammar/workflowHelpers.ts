/**
 * Helper functions for spelling/grammar workflow
 */

import type { SpellingGrammarHighlight, ChunkWithLineNumbers } from "./types";
import type { Comment } from "../../../types/documentSchema";
import type { ErrorGroup } from "./postProcessing";
import { convertHighlightsToComments } from "./highlightConverter";
import { getErrorGroupEmoji, getErrorTypeLabel } from "./utils";
import { DocumentProcessor } from "./documentProcessor";
import { SEVERITY_TO_IMPORTANCE, SEVERITY_TO_GRADE } from "./constants";
import { logger } from "@/lib/logger";

/**
 * Process highlights for a single error group into comments
 */
export function processErrorGroupToComments(
  errorGroup: ErrorGroup,
  fullContent: string,
  docProcessor?: DocumentProcessor
): Comment[] {
  const comments: Comment[] = [];
  
  // Limit examples: show 1 if there are many occurrences, otherwise show all
  const exampleCount = errorGroup.count > 2 ? 1 : errorGroup.count;
  
  for (const highlight of errorGroup.examples.slice(0, exampleCount)) {
    // Use document processor if provided, otherwise create one
    const processor = docProcessor || new DocumentProcessor(fullContent);
    
    // Calculate the character offset for the start of the line
    const lineStartOffset = processor.getCharacterOffsetForLine(highlight.lineStart);
    
    // Get the content of the lines involved in this highlight
    const highlightContent = processor.getContentForLineRange(highlight.lineStart, highlight.lineEnd);
    
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
    
    // Adjust importance and grade based on severity
    chunkComments.forEach(comment => {
      comment.importance = SEVERITY_TO_IMPORTANCE[errorGroup.severity as keyof typeof SEVERITY_TO_IMPORTANCE] || 3;
      comment.grade = SEVERITY_TO_GRADE[errorGroup.severity as keyof typeof SEVERITY_TO_GRADE] || 60;
      
      // Add emoji and type label if not already formatted
      const startsWithEmoji = /^[\u{1F300}-\u{1F9FF}]|^[\u{2600}-\u{27BF}]/u.test(comment.description);
      if (!startsWithEmoji) {
        const emoji = getErrorGroupEmoji(errorGroup);
        const typeLabel = getErrorTypeLabel(errorGroup.errorType);
        comment.description = `${emoji} ${typeLabel}: ${comment.description}`;
      }
    });
    
    comments.push(...chunkComments);
  }
  
  return comments;
}

/**
 * Create a convention warning comment
 */
export function createConventionWarningComment(
  conventionIssues: { description: string; examples: string[] },
  fullContent: string
): Comment {
  return {
    description: `🔄 Consistency: ${conventionIssues.description}`,
    importance: 9,
    grade: 10,
    highlight: {
      startOffset: 0,
      endOffset: 50, // Just highlight the beginning
      quotedText: fullContent.slice(0, 50) + "...",
      isValid: true
    },
    isValid: true
  };
}

/**
 * Calculate token usage totals from chunk results
 */
export interface TokenUsageTotals {
  inputTokens: number;
  outputTokens: number;
}

export function calculateTokenTotals(
  chunkResults: Array<{ usage?: { input_tokens?: number; output_tokens?: number } }>
): TokenUsageTotals {
  let inputTokens = 0;
  let outputTokens = 0;
  
  chunkResults.forEach(result => {
    if (result.usage) {
      inputTokens += result.usage.input_tokens || 0;
      outputTokens += result.usage.output_tokens || 0;
    }
  });
  
  return { inputTokens, outputTokens };
}

/**
 * Create error type breakdown from highlights
 */
export function createErrorTypeBreakdown(
  highlights: SpellingGrammarHighlight[]
): Record<string, number> {
  return highlights.reduce((acc, h) => {
    const type = h.errorType || inferErrorType(h.description);
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
}

/**
 * Infer error type from description if not provided
 */
function inferErrorType(description: string): string {
  const desc = description.toLowerCase();
  if (desc.includes('spelling') || desc.includes('misspell')) return 'spelling';
  if (desc.includes('grammar')) return 'grammar';
  if (desc.includes('punctuation')) return 'punctuation';
  if (desc.includes('capitalization')) return 'capitalization';
  if (desc.includes('word choice')) return 'word_choice';
  if (desc.includes('consistency')) return 'consistency';
  return 'other';
}

/**
 * Format error breakdown for logging
 */
export function formatErrorBreakdown(errorTypes: Record<string, number>): string {
  return Object.entries(errorTypes)
    .map(([type, count]) => `${count} ${type}`)
    .join(', ');
}

/**
 * Create detailed chunk log message
 */
export function createChunkLogMessage(
  chunkIndex: number,
  chunk: ChunkWithLineNumbers,
  highlights: SpellingGrammarHighlight[],
  errorTypes: Record<string, number>
): string {
  const errorSummary = formatErrorBreakdown(errorTypes);
  const preview = chunk.content.substring(0, 200).replace(/\n/g, ' ') + 
                  (chunk.content.length > 200 ? '...' : '');
  
  return `Analyzed chunk ${chunkIndex + 1} (lines ${chunk.startLineNumber}-${
    chunk.startLineNumber + chunk.lines.length - 1
  }): ${highlights.length} errors found${errorSummary ? ` (${errorSummary})` : ''}. Preview: "${preview}"`;
}