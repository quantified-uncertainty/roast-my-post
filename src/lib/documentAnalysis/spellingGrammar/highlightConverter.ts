import type { Comment } from "../../../types/documentSchema";
import type { SpellingGrammarHighlight } from "./types";
import { logger } from "@/lib/logger";

/**
 * Converts spelling/grammar highlights from line-based format to character offsets
 * @param highlights - Array of highlights from LLM with line numbers and exact text
 * @param fullContent - The full document content (including any prepend)
 * @param chunkStartOffset - The character offset where this chunk starts in the full document
 * @returns Array of Comment objects with character offsets
 */
export function convertHighlightsToComments(
  highlights: SpellingGrammarHighlight[],
  fullContent: string,
  chunkStartOffset: number = 0
): Comment[] {
  const comments: Comment[] = [];
  const lines = fullContent.split("\n");
  
  // Build line offset map for the full content
  const lineOffsets: number[] = [];
  let currentOffset = 0;
  for (let i = 0; i < lines.length; i++) {
    lineOffsets[i] = currentOffset;
    currentOffset += lines[i].length + 1; // +1 for newline
  }

  for (const highlight of highlights) {
    try {
      // Convert 1-based line numbers to 0-based indices
      const startLineIndex = highlight.lineStart - 1;
      const endLineIndex = highlight.lineEnd - 1;

      // Validate line numbers
      if (startLineIndex < 0 || endLineIndex >= lines.length) {
        logger.warn(`Invalid line numbers: ${highlight.lineStart}-${highlight.lineEnd}, document has ${lines.length} lines`);
        continue;
      }

      // Find the exact text position within the document
      const searchResult = findTextInLines(
        lines,
        highlight.highlightedText,
        startLineIndex,
        endLineIndex
      );

      if (!searchResult) {
        logger.warn(
          `Could not find highlighted text "${highlight.highlightedText.substring(0, 50)}..." in lines ${highlight.lineStart}-${highlight.lineEnd}`
        );
        continue;
      }

      const comment: Comment = {
        description: highlight.description,
        importance: 7, // Grammar/spelling errors are moderately important
        grade: 20, // Low grade for errors
        highlight: {
          startOffset: chunkStartOffset + searchResult.startOffset,
          endOffset: chunkStartOffset + searchResult.endOffset,
          quotedText: highlight.highlightedText,
          isValid: true,
        },
        isValid: true,
      };

      comments.push(comment);
    } catch (error) {
      logger.error(`Error converting highlight to comment:`, error);
      
      // Create invalid comment for debugging
      const invalidComment: Comment = {
        description: highlight.description,
        importance: 7,
        grade: 20,
        highlight: {
          startOffset: -1,
          endOffset: -1,
          quotedText: highlight.highlightedText,
          isValid: false,
        },
        isValid: false,
        error: `Failed to convert highlight: ${error instanceof Error ? error.message : String(error)}`,
      };
      comments.push(invalidComment);
    }
  }

  return comments;
}

/**
 * Finds the exact character offsets of text within specified lines
 */
function findTextInLines(
  lines: string[],
  searchText: string,
  startLineIndex: number,
  endLineIndex: number
): { startOffset: number; endOffset: number } | null {
  // Build the content for the line range
  let rangeContent = "";
  let rangeStartOffset = 0;
  
  // Calculate the offset to the start of the range
  for (let i = 0; i < startLineIndex; i++) {
    rangeStartOffset += lines[i].length + 1; // +1 for newline
  }
  
  // Build the content within the range
  for (let i = startLineIndex; i <= endLineIndex && i < lines.length; i++) {
    if (i > startLineIndex) {
      rangeContent += "\n";
    }
    rangeContent += lines[i];
  }

  // Find the text within the range
  const index = rangeContent.indexOf(searchText);
  if (index === -1) {
    // Try case-insensitive search as fallback
    const lowerSearch = searchText.toLowerCase();
    const lowerContent = rangeContent.toLowerCase();
    const lowerIndex = lowerContent.indexOf(lowerSearch);
    
    if (lowerIndex !== -1) {
      logger.debug(`Using case-insensitive match for "${searchText}"`);
      return {
        startOffset: rangeStartOffset + lowerIndex,
        endOffset: rangeStartOffset + lowerIndex + searchText.length,
      };
    }
    
    return null;
  }

  return {
    startOffset: rangeStartOffset + index,
    endOffset: rangeStartOffset + index + searchText.length,
  };
}

/**
 * Validates that converted highlights have correct offsets
 */
export function validateConvertedHighlights(
  comments: Comment[],
  fullContent: string
): boolean {
  let allValid = true;

  for (const comment of comments) {
    if (!comment.isValid || !comment.highlight.isValid) {
      continue;
    }

    const { startOffset, endOffset, quotedText } = comment.highlight;

    // Check bounds
    if (startOffset < 0 || endOffset > fullContent.length || startOffset >= endOffset) {
      logger.error(
        `Invalid offsets: start=${startOffset}, end=${endOffset}, content length=${fullContent.length}`
      );
      allValid = false;
      continue;
    }

    // Check that extracted text matches
    const extractedText = fullContent.substring(startOffset, endOffset);
    if (extractedText !== quotedText) {
      logger.error(
        `Text mismatch at offsets ${startOffset}-${endOffset}: expected "${quotedText}", got "${extractedText}"`
      );
      allValid = false;
    }
  }

  return allValid;
}