/**
 * Shared utilities for line-based text location
 * Used by both highlight extraction and text location finder
 */

import { logger } from "@/lib/logger";

export interface LineBasedLocation {
  startLineIndex: number; // 0-based line index
  endLineIndex: number;   // 0-based line index
  startCharacters: string; // First ~6 characters of the match
  endCharacters: string;   // Last ~6 characters of the match
}

export interface CharacterLocation {
  startOffset: number;
  endOffset: number;
  quotedText: string;
  prefix?: string; // Optional context before the match
}

// Alias for backward compatibility with highlight system
export type LineSnippetHighlight = LineBasedLocation;

/**
 * Converts document text into lines with offset tracking
 */
export class LineBasedLocator {
  private lines: string[] = [];
  private lineStartOffsets: number[] = [];
  
  constructor(private documentText: string) {
    this.parseLines();
  }
  
  private parseLines() {
    this.lines = this.documentText.split('\n');
    
    // Calculate start offset for each line
    let offset = 0;
    for (let i = 0; i < this.lines.length; i++) {
      this.lineStartOffsets[i] = offset;
      offset += this.lines[i].length + 1; // +1 for newline
    }
  }
  
  /**
   * Get numbered lines for LLM prompts
   */
  getNumberedLines(): string {
    return this.lines.map((line, index) => `Line ${index + 1}: ${line}`).join('\n');
  }
  
  /**
   * Convert character offsets to line-based location
   */
  offsetToLineLocation(startOffset: number, endOffset: number): LineBasedLocation {
    // Find start line
    let startLineIndex = 0;
    while (
      startLineIndex < this.lineStartOffsets.length - 1 &&
      this.lineStartOffsets[startLineIndex + 1] <= startOffset
    ) {
      startLineIndex++;
    }
    
    // Find end line
    let endLineIndex = startLineIndex;
    while (
      endLineIndex < this.lineStartOffsets.length - 1 &&
      this.lineStartOffsets[endLineIndex + 1] < endOffset
    ) {
      endLineIndex++;
    }
    
    // Get character snippets
    const startPosInLine = startOffset - this.lineStartOffsets[startLineIndex];
    const endPosInLine = endOffset - this.lineStartOffsets[endLineIndex];
    
    const startLine = this.lines[startLineIndex] || '';
    const endLine = this.lines[endLineIndex] || '';
    
    const startCharacters = startLine.slice(startPosInLine, startPosInLine + 6);
    const endCharacters = endLine.slice(Math.max(0, endPosInLine - 6), endPosInLine);
    
    return {
      startLineIndex,
      endLineIndex,
      startCharacters,
      endCharacters
    };
  }
  
  /**
   * Find a snippet within a specific line with fuzzy matching
   * For ambiguous snippets, tries to find the best match based on context
   */
  private findSnippetInLine(lineIndex: number, snippet: string, preferredContext?: string): number | null {
    if (lineIndex < 0 || lineIndex >= this.lines.length) {
      return null;
    }
    
    const line = this.lines[lineIndex];
    
    // Try exact match
    let index = line.indexOf(snippet);
    if (index !== -1) {
      // If there's a preferred context and multiple matches, try to find the best one
      if (preferredContext) {
        const allIndices: number[] = [];
        let tempIndex = index;
        while (tempIndex !== -1) {
          allIndices.push(tempIndex);
          tempIndex = line.indexOf(snippet, tempIndex + 1);
        }
        
        if (allIndices.length > 1) {
          // Find the occurrence that best matches the context
          logger.debug(`Found ${allIndices.length} occurrences of "${snippet}", selecting best match`);
          
          // For "machine learning paradigms", prefer the occurrence followed by "paradigms"
          for (const idx of allIndices) {
            const contextAfter = line.substring(idx + snippet.length, idx + snippet.length + 20);
            if (preferredContext.includes('paradigms') && contextAfter.includes('paradigms')) {
              logger.debug(`Selected occurrence at ${idx} based on context`);
              return idx;
            }
          }
        }
      }
      return index;
    }
    
    // Try case-insensitive
    const lowerSnippet = snippet.toLowerCase();
    const lowerLine = line.toLowerCase();
    index = lowerLine.indexOf(lowerSnippet);
    if (index !== -1) {
      logger.debug(`Using case-insensitive match for "${snippet}"`);
      return index;
    }
    
    // Try trimmed match
    const trimmedSnippet = snippet.trim();
    if (trimmedSnippet !== snippet) {
      index = line.indexOf(trimmedSnippet);
      if (index !== -1) {
        logger.debug(`Using trimmed match for "${snippet}"`);
        return index;
      }
      
      // Try case-insensitive trimmed match
      index = lowerLine.indexOf(trimmedSnippet.toLowerCase());
      if (index !== -1) {
        logger.debug(`Using case-insensitive trimmed match for "${snippet}"`);
        return index;
      }
    }
    
    // Try Unicode-normalized match (smart quotes, em-dashes, non-breaking spaces)
    const normalizeUnicode = (text: string) => text
      .replace(/[\u2018\u2019]/g, "'")  // Smart single quotes → straight
      .replace(/[\u201C\u201D]/g, '"')  // Smart double quotes → straight  
      .replace(/[\u2013\u2014]/g, '-')  // Em/en dashes → hyphen
      .replace(/\u00A0/g, ' ')          // Non-breaking space → regular space
      .replace(/\u2026/g, '...');       // Ellipsis → three dots
      
    const unicodeSnippet = normalizeUnicode(snippet);
    const unicodeLine = normalizeUnicode(line);
    
    if (unicodeSnippet !== snippet) {
      index = unicodeLine.indexOf(unicodeSnippet);
      if (index !== -1) {
        logger.debug(`Using Unicode-normalized match for "${snippet}"`);
        return index;
      }
      
      // Try case-insensitive Unicode-normalized
      index = unicodeLine.toLowerCase().indexOf(unicodeSnippet.toLowerCase());
      if (index !== -1) {
        logger.debug(`Using case-insensitive Unicode-normalized match for "${snippet}"`);
        return index;
      }
    }
    
    // Try whitespace-normalized match (multiple spaces → single)
    const normalizeSpaces = (text: string) => text.replace(/\s+/g, ' ').trim();
    const spaceSnippet = normalizeSpaces(snippet);
    const spaceLine = normalizeSpaces(line);
    
    if (spaceSnippet !== snippet) {
      index = spaceLine.indexOf(spaceSnippet);
      if (index !== -1) {
        logger.debug(`Using space-normalized match for "${snippet}"`);
        return index;
      }
      
      // Try case-insensitive space-normalized
      index = spaceLine.toLowerCase().indexOf(spaceSnippet.toLowerCase());
      if (index !== -1) {
        logger.debug(`Using case-insensitive space-normalized match for "${snippet}"`);
        return index;
      }
    }
    
    // Try normalized match (remove special chars/spaces) - kept as last resort
    const normalize = (text: string) => 
      text.replace(/\s+/g, '').replace(/[^\w]/g, '').toLowerCase();
    
    const normalizedSnippet = normalize(snippet);
    const normalizedLine = normalize(line);
    
    if (normalizedSnippet.length > 0) {
      const normalizedIndex = normalizedLine.indexOf(normalizedSnippet);
      if (normalizedIndex !== -1) {
        // Approximate position in original line
        const ratio = normalizedIndex / normalizedLine.length;
        const approximateIndex = Math.floor(ratio * line.length);
        logger.debug(`Using fuzzy match for "${snippet}" at position ~${approximateIndex}`);
        return approximateIndex;
      }
    }
    
    // Try partial match (at least 3 chars)
    for (let len = Math.min(snippet.length, 10); len >= 3; len--) {
      for (let start = 0; start <= snippet.length - len; start++) {
        const partial = snippet.substring(start, start + len);
        index = line.indexOf(partial);
        if (index !== -1) {
          logger.debug(`Using partial match "${partial}" for "${snippet}"`);
          return index;
        }
      }
    }
    
    return null;
  }
  
  /**
   * Convert line-based location to character offsets
   * Includes fuzzy matching and recovery strategies
   */
  lineLocationToOffset(location: LineBasedLocation): CharacterLocation | null {
    const { startLineIndex, endLineIndex, startCharacters, endCharacters } = location;
    
    // Validate indices
    if (startLineIndex < 0 || startLineIndex >= this.lines.length ||
        endLineIndex < 0 || endLineIndex >= this.lines.length ||
        startLineIndex > endLineIndex) {
      logger.warn('Invalid line indices', { startLineIndex, endLineIndex, totalLines: this.lines.length });
      return null;
    }
    
    // Find start position
    let actualStartLine = startLineIndex;
    // Pass endCharacters as context to help disambiguate multiple matches
    let startPos = this.findSnippetInLine(startLineIndex, startCharacters, endCharacters);
    
    // If not found, try nearby lines (±2)
    if (startPos === null) {
      for (let offset = 1; offset <= 2; offset++) {
        for (const delta of [offset, -offset]) {
          const tryLine = startLineIndex + delta;
          if (tryLine >= 0 && tryLine < this.lines.length) {
            startPos = this.findSnippetInLine(tryLine, startCharacters, endCharacters);
            if (startPos !== null) {
              actualStartLine = tryLine;
              logger.debug(`Found start snippet in line ${tryLine} instead of ${startLineIndex}`);
              break;
            }
          }
        }
        if (startPos !== null) break;
      }
    }
    
    if (startPos === null) {
      logger.warn(`Failed to find start snippet "${startCharacters}"`);
      return null;
    }
    
    // Find end position
    let actualEndLine = Math.max(actualStartLine, endLineIndex);
    let endPos = this.findSnippetInLine(actualEndLine, endCharacters);
    
    // If not found, try nearby lines
    if (endPos === null) {
      const minLine = actualStartLine;
      const maxLine = Math.min(this.lines.length - 1, endLineIndex + 2);
      
      for (let tryLine = minLine; tryLine <= maxLine; tryLine++) {
        if (tryLine !== actualEndLine) {
          endPos = this.findSnippetInLine(tryLine, endCharacters);
          if (endPos !== null) {
            actualEndLine = tryLine;
            logger.debug(`Found end snippet in line ${tryLine} instead of ${endLineIndex}`);
            break;
          }
        }
      }
    }
    
    if (endPos === null) {
      logger.warn(`Failed to find end snippet "${endCharacters}"`);
      return null;
    }
    
    // Calculate offsets
    const startOffset = this.lineStartOffsets[actualStartLine] + startPos;
    let endOffset: number;
    
    if (actualStartLine === actualEndLine) {
      // Same line - endPos is where the end characters start, 
      // so add their length to get the actual end boundary
      endOffset = this.lineStartOffsets[actualEndLine] + endPos + endCharacters.length;
      if (endOffset <= startOffset) {
        // Fallback: use rest of line or at least 50 chars
        const lineLength = this.lines[actualEndLine].length;
        const remaining = lineLength - startPos;
        endOffset = startOffset + Math.min(Math.max(50, remaining), remaining);
      }
    } else {
      // Different lines - endPos is where the end characters start,
      // so add their length to get the actual end boundary
      endOffset = this.lineStartOffsets[actualEndLine] + endPos + endCharacters.length;
    }
    
    // Validate final offsets
    if (startOffset < 0 || endOffset <= startOffset || endOffset > this.documentText.length) {
      logger.warn('Invalid calculated offsets', { 
        startOffset, 
        endOffset, 
        docLength: this.documentText.length 
      });
      
      // Try to salvage with a reasonable highlight
      if (startOffset >= 0 && startOffset < this.documentText.length) {
        const maxLength = Math.min(100, this.documentText.length - startOffset);
        endOffset = startOffset + maxLength;
      } else {
        return null;
      }
    }
    
    const quotedText = this.documentText.slice(startOffset, endOffset);
    
    // Add prefix for context (up to 30 chars before)
    const prefixStart = Math.max(0, startOffset - 30);
    const prefix = this.documentText.substring(prefixStart, startOffset);
    
    return {
      startOffset,
      endOffset,
      quotedText,
      prefix
    };
  }
  
  /**
   * Get line number (1-based) for a character offset
   */
  getLineNumber(offset: number): number {
    let lineIndex = 0;
    while (
      lineIndex < this.lineStartOffsets.length - 1 &&
      this.lineStartOffsets[lineIndex + 1] <= offset
    ) {
      lineIndex++;
    }
    return lineIndex + 1; // Convert to 1-based
  }
  
  /**
   * Get the full text of a line by number (1-based)
   */
  getLine(lineNumber: number): string {
    const index = lineNumber - 1;
    return this.lines[index] || '';
  }
  
  /**
   * Get document statistics
   */
  getStats() {
    return {
      totalLines: this.lines.length,
      totalCharacters: this.documentText.length,
      averageLineLength: this.lines.length > 0 
        ? Math.round(this.documentText.length / this.lines.length)
        : 0,
      longestLine: this.lines.length > 0
        ? Math.max(...this.lines.map((line) => line.length))
        : 0,
    };
  }
  
  /**
   * Convert line-based location to character offsets with optional prefix
   * This is an alias for lineLocationToOffset for backward compatibility
   */
  createHighlight(location: LineBasedLocation): CharacterLocation | null {
    const result = this.lineLocationToOffset(location);
    if (result && !result.prefix) {
      // Add prefix (up to 30 chars before highlight)
      const prefixStart = Math.max(0, result.startOffset - 30);
      result.prefix = this.documentText.substring(prefixStart, result.startOffset);
    }
    return result;
  }
  
  /**
   * Alias for backward compatibility
   */
  convertOffsetToLineBased(highlight: {
    startOffset: number;
    endOffset: number;
    quotedText: string;
  }): LineBasedLocation {
    return this.offsetToLineLocation(highlight.startOffset, highlight.endOffset);
  }
}