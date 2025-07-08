import type { Comment } from "../../../types/documentSchema";
import { logger } from "@/lib/logger";
import type { LineBasedHighlight } from "./types";

// Line-based highlight interfaces
export interface LineSnippetHighlight {
  startLineIndex: number; // Which line to start (0-based)
  startCharacters: string; // First ~6 chars of highlight
  endLineIndex: number; // Which line to end (0-based)
  endCharacters: string; // Last ~6 chars of highlight
}

// Re-export from types to maintain backward compatibility
export type { LineBasedHighlight };

/**
 * Line-based highlighting using character snippets for precise positioning
 * Optimized for LessWrong-style markdown posts
 */
export class LineBasedHighlighter {
  private originalContent: string;
  private lines: string[] = [];
  private lineStartOffsets: number[] = [];

  constructor(content: string) {
    this.originalContent = content;
    this.parseLines();
  }

  private parseLines() {
    this.lines = this.originalContent.split("\n");

    // Calculate start offset for each line in the original document
    let offset = 0;
    for (let i = 0; i < this.lines.length; i++) {
      this.lineStartOffsets[i] = offset;
      offset += this.lines[i].length + 1; // +1 for the \n character
    }
  }

  /**
   * Get the numbered lines content for the LLM prompt
   */
  getNumberedLines(): string {
    return this.lines.map((line, index) => `Line ${index + 1}: ${line}`).join("\n");
  }

  /**
   * Get document statistics for the LLM prompt
   */
  getStats() {
    return {
      totalLines: this.lines.length,
      totalCharacters: this.originalContent.length,
      averageLineLength: Math.round(
        this.originalContent.length / this.lines.length
      ),
      longestLine: Math.max(...this.lines.map((line) => line.length)),
    };
  }

  /**
   * Convert offset-based highlight to line-based format
   */
  convertOffsetToLineBased(highlight: {
    startOffset: number;
    endOffset: number;
    quotedText: string;
  }): LineSnippetHighlight {
    // Find the line containing startOffset
    let startLineIndex = 0;
    while (
      startLineIndex < this.lineStartOffsets.length - 1 &&
      this.lineStartOffsets[startLineIndex + 1] <= highlight.startOffset
    ) {
      startLineIndex++;
    }

    // Find the line containing endOffset
    let endLineIndex = startLineIndex;
    while (
      endLineIndex < this.lineStartOffsets.length - 1 &&
      this.lineStartOffsets[endLineIndex + 1] <= highlight.endOffset
    ) {
      endLineIndex++;
    }

    // Get the text snippets
    const startPosInLine =
      highlight.startOffset - this.lineStartOffsets[startLineIndex];
    const endPosInLine =
      highlight.endOffset - this.lineStartOffsets[endLineIndex];

    const startCharacters = this.lines[startLineIndex].slice(
      startPosInLine,
      startPosInLine + 6
    );
    const endCharacters = this.lines[endLineIndex].slice(
      endPosInLine - 6,
      endPosInLine
    );

    return {
      startLineIndex,
      startCharacters,
      endLineIndex,
      endCharacters,
    };
  }

  /**
   * Calculate similarity between two strings (0-1)
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();
    
    if (s1 === s2) return 1;
    if (s1.length === 0 || s2.length === 0) return 0;
    
    // Simple character-based similarity
    let matches = 0;
    const minLen = Math.min(s1.length, s2.length);
    for (let i = 0; i < minLen; i++) {
      if (s1[i] === s2[i]) matches++;
    }
    
    // Also check if one string contains the other
    if (s1.includes(s2) || s2.includes(s1)) {
      return Math.max(0.8, matches / Math.max(s1.length, s2.length));
    }
    
    return matches / Math.max(s1.length, s2.length);
  }

  /**
   * Find a character snippet within a specific line using fuzzy matching
   */
  private findSnippetInLine(lineIndex: number, snippet: string): number | null {
    if (lineIndex >= this.lines.length) {
      console.warn(
        `Line index ${lineIndex} exceeds document length ${this.lines.length}`
      );
      return null;
    }

    const line = this.lines[lineIndex];

    // Try exact match first
    const exactIndex = line.indexOf(snippet);
    if (exactIndex !== -1) {
      return exactIndex;
    }

    // Try case-insensitive exact match
    const lowerSnippet = snippet.toLowerCase();
    const lowerLine = line.toLowerCase();
    const caseInsensitiveIndex = lowerLine.indexOf(lowerSnippet);
    if (caseInsensitiveIndex !== -1) {
      console.warn(`Using case-insensitive match for "${snippet}" in line ${lineIndex}`);
      return caseInsensitiveIndex;
    }

    // Try trimmed exact match (remove leading/trailing whitespace)
    const trimmedSnippet = snippet.trim();
    const trimmedIndex = line.indexOf(trimmedSnippet);
    if (trimmedIndex !== -1) {
      console.warn(`Using trimmed match "${trimmedSnippet}" instead of "${snippet}" in line ${lineIndex}`);
      return trimmedIndex;
    }

    // Try fuzzy matching - remove spaces and special chars for comparison
    const normalizeForSearch = (text: string) =>
      text.replace(/\s+/g, "").replace(/[^\w]/g, "").toLowerCase();

    const normalizedSnippet = normalizeForSearch(snippet);
    const normalizedLine = normalizeForSearch(line);

    if (normalizedSnippet.length > 0) {
      const fuzzyIndex = normalizedLine.indexOf(normalizedSnippet);
      if (fuzzyIndex !== -1) {
        // Map back to original line position (approximate)
        const ratio = fuzzyIndex / normalizedLine.length;
        const approximateIndex = Math.floor(ratio * line.length);
        console.warn(`Using fuzzy match for "${snippet}" at approximate position ${approximateIndex} in line ${lineIndex}`);
        return approximateIndex;
      }
    }

    // Try similarity-based fuzzy matching
    if (snippet.length >= 3) {
      const windowSize = snippet.length;
      let bestMatch = { position: -1, similarity: 0 };
      
      // Slide window across line
      for (let i = 0; i <= Math.max(0, line.length - windowSize + 2); i++) {
        const window = line.substring(i, Math.min(i + windowSize + 2, line.length));
        const similarity = this.calculateSimilarity(snippet, window);
        
        if (similarity > bestMatch.similarity && similarity >= 0.75) {
          bestMatch = { position: i, similarity };
        }
      }
      
      if (bestMatch.position !== -1) {
        console.warn(
          `Using similarity match for "${snippet}" at position ${bestMatch.position} with ${Math.round(bestMatch.similarity * 100)}% similarity`
        );
        return bestMatch.position;
      }
    }
    
    // Try partial matching - find the longest common substring
    for (let len = Math.min(snippet.length, 10); len >= 3; len--) {
      for (let start = 0; start <= snippet.length - len; start++) {
        const partial = snippet.substring(start, start + len);
        const partialIndex = line.indexOf(partial);
        if (partialIndex !== -1) {
          console.warn(
            `Using partial match "${partial}" instead of "${snippet}" in line ${lineIndex}`
          );
          return partialIndex;
        }
      }
    }

    // Try searching in nearby lines as a fallback (LLM might have line numbers slightly off)
    const searchRange = 2;
    for (let offset = 1; offset <= searchRange; offset++) {
      // Check line above
      if (lineIndex - offset >= 0) {
        const nearbyLine = this.lines[lineIndex - offset];
        const nearbyIndex = nearbyLine.indexOf(snippet);
        if (nearbyIndex !== -1) {
          console.warn(
            `Found snippet "${snippet}" in nearby line ${lineIndex - offset} instead of line ${lineIndex}`
          );
          // Don't return this match, just log it for debugging
        }
      }
      
      // Check line below
      if (lineIndex + offset < this.lines.length) {
        const nearbyLine = this.lines[lineIndex + offset];
        const nearbyIndex = nearbyLine.indexOf(snippet);
        if (nearbyIndex !== -1) {
          console.warn(
            `Found snippet "${snippet}" in nearby line ${lineIndex + offset} instead of line ${lineIndex}`
          );
          // Don't return this match, just log it for debugging
        }
      }
    }

    console.warn(
      `Could not find snippet "${snippet}" in line ${lineIndex}: "${line}"`
    );
    return null;
  }

  /**
   * Convert line-based highlight to document character offsets
   */
  createHighlight(
    highlight: LineSnippetHighlight
  ): { startOffset: number; endOffset: number; text: string; prefix: string } | null {
    const { startLineIndex, startCharacters, endLineIndex, endCharacters } =
      highlight;

    // Validate line indices first
    if (startLineIndex < 0 || startLineIndex >= this.lines.length) {
      console.warn(`Invalid startLineIndex ${startLineIndex}, document has ${this.lines.length} lines`);
      return null;
    }
    
    if (endLineIndex < 0 || endLineIndex >= this.lines.length) {
      console.warn(`Invalid endLineIndex ${endLineIndex}, document has ${this.lines.length} lines`);
      return null;
    }

    if (startLineIndex > endLineIndex) {
      console.warn(`startLineIndex ${startLineIndex} is after endLineIndex ${endLineIndex}`);
      return null;
    }

    // Find start position with fuzzy line matching
    let actualStartLineIndex = startLineIndex;
    let startPosInLine = this.findSnippetInLine(startLineIndex, startCharacters);
    
    // If not found, try nearby lines (±2 lines)
    if (startPosInLine === null) {
      console.warn(`Start snippet "${startCharacters}" not found in line ${startLineIndex}, trying nearby lines...`);
      
      for (let offset = 1; offset <= 2; offset++) {
        // Try lines before and after
        for (const lineOffset of [offset, -offset]) {
          const tryLineIndex = startLineIndex + lineOffset;
          if (tryLineIndex >= 0 && tryLineIndex < this.lines.length) {
            startPosInLine = this.findSnippetInLine(tryLineIndex, startCharacters);
            if (startPosInLine !== null) {
              console.log(`Found start snippet in line ${tryLineIndex} (offset ${lineOffset} from original)`);
              actualStartLineIndex = tryLineIndex;
              break;
            }
          }
        }
        if (startPosInLine !== null) break;
      }
    }
    
    if (startPosInLine === null) {
      console.warn(`Failed to find start snippet "${startCharacters}" in line ${startLineIndex} or nearby lines`);
      return null;
    }

    // Find end position with fuzzy line matching
    let actualEndLineIndex = endLineIndex;
    let endPosInLine = this.findSnippetInLine(endLineIndex, endCharacters);
    
    // If not found, try nearby lines (±2 lines)
    if (endPosInLine === null) {
      console.warn(`End snippet "${endCharacters}" not found in line ${endLineIndex}, trying nearby lines...`);
      
      // Adjust search based on actualStartLineIndex to maintain valid range
      const minSearchLine = Math.max(actualStartLineIndex, endLineIndex - 2);
      const maxSearchLine = Math.min(this.lines.length - 1, endLineIndex + 2);
      
      for (let tryLineIndex = minSearchLine; tryLineIndex <= maxSearchLine; tryLineIndex++) {
        if (tryLineIndex !== endLineIndex) {
          endPosInLine = this.findSnippetInLine(tryLineIndex, endCharacters);
          if (endPosInLine !== null) {
            console.log(`Found end snippet in line ${tryLineIndex} (offset ${tryLineIndex - endLineIndex} from original)`);
            actualEndLineIndex = tryLineIndex;
            break;
          }
        }
      }
    }
    
    if (endPosInLine === null) {
      console.warn(`Failed to find end snippet "${endCharacters}" in line ${endLineIndex} or nearby lines`);
      return null;
    }

    // Convert to document offsets using actual line indices
    const startOffset = this.lineStartOffsets[actualStartLineIndex] + startPosInLine;
    let endOffset: number;

    if (actualStartLineIndex === actualEndLineIndex) {
      // Same line - end position should be after start position
      const endPosAdjusted = endPosInLine + endCharacters.length;
      if (endPosAdjusted <= startPosInLine) {
        console.warn(
          `End position ${endPosAdjusted} is before start position ${startPosInLine} on line ${actualStartLineIndex}. Attempting to fix...`
        );
        
        // Try to find a reasonable end position after the start
        const lineText = this.lines[actualStartLineIndex];
        const remainingText = lineText.substring(startPosInLine);
        const minHighlightLength = Math.min(50, remainingText.length);
        endOffset = startOffset + minHighlightLength;
      } else {
        endOffset = this.lineStartOffsets[actualEndLineIndex] + endPosAdjusted;
      }
    } else {
      // Different lines
      endOffset =
        this.lineStartOffsets[actualEndLineIndex] +
        endPosInLine +
        endCharacters.length;
    }

    // Validate offsets
    if (
      startOffset < 0 ||
      endOffset <= startOffset ||
      endOffset > this.originalContent.length
    ) {
      console.warn(
        `Invalid offsets: start=${startOffset}, end=${endOffset}, content length=${this.originalContent.length}`
      );
      
      // Try to create a valid fallback highlight
      if (startOffset >= 0 && startOffset < this.originalContent.length) {
        const maxLength = Math.min(100, this.originalContent.length - startOffset);
        endOffset = startOffset + maxLength;
        console.warn(`Using fallback highlight of ${maxLength} characters`);
      } else {
        return null;
      }
    }

    const text = this.originalContent.slice(startOffset, endOffset);
    
    // Add context prefix (up to 30 chars before highlight)
    const prefixStart = Math.max(0, startOffset - 30);
    const prefix = this.originalContent.substring(prefixStart, startOffset);

    return {
      startOffset,
      endOffset,
      text,
      prefix,
    };
  }

  /**
   * Process highlights with line-based highlights and convert to standard Comment format
   */
  processLineHighlights(highlights: LineBasedHighlight[]): Comment[] {
    const processedComments: Comment[] = [];

    for (const highlight of highlights) {
      const highlightResult = this.createHighlight(highlight.highlight);

      if (highlightResult) {
        const processedComment: Comment = {
          description: highlight.description,
          importance: highlight.importance || 5,
          grade: highlight.grade,
          highlight: {
            startOffset: highlightResult.startOffset,
            endOffset: highlightResult.endOffset,
            quotedText: highlightResult.text,
            isValid: true,
            prefix: highlightResult.prefix,
          },
          isValid: true,
        };
        processedComments.push(processedComment);
      } else {
        // Create invalid highlight for debugging
        const invalidComment: Comment = {
          description: highlight.description,
          importance: highlight.importance || 5,
          grade: highlight.grade,
          highlight: {
            startOffset: -1,
            endOffset: -1,
            quotedText: "",
            isValid: false,
          },
          isValid: false,
          error: `Could not find highlight: lines ${highlight.highlight.startLineIndex}-${highlight.highlight.endLineIndex}, snippets "${highlight.highlight.startCharacters}" to "${highlight.highlight.endCharacters}"`,
        };
        processedComments.push(invalidComment);
      }
    }

    return processedComments;
  }
}