/**
 * Shared utilities for converting between character offsets and line numbers.
 * Used by both plugins and highlight extraction.
 */

import { TextChunk } from '../../../analysis-plugins';
import { Finding } from '../../../analysis-plugins/types';

export interface LineInfo {
  lineNumber: number; // 1-based line number for human readability
  lineIndex: number; // 0-based line index for array access
  positionInLine: number; // Character position within the line
  lineText: string; // The actual text of the line
}

export interface LocationInfo {
  start: LineInfo;
  end: LineInfo;
  text: string; // The highlighted text
}

export interface LocationInfoExtended {
  lineNumber?: number;
  lineText?: string;
  startLine?: number;
  endLine?: number;
  position?: {
    start: number;
    end: number;
  };
}

export class LocationUtils {
  private lines: string[] = [];
  private lineStartOffsets: number[] = [];

  constructor(content: string) {
    this.parseLines(content);
  }

  private parseLines(content: string) {
    this.lines = content.split('\n');
    
    // Calculate start offset for each line
    let offset = 0;
    for (let i = 0; i < this.lines.length; i++) {
      this.lineStartOffsets[i] = offset;
      offset += this.lines[i].length + 1; // +1 for the \n character
    }
  }

  /**
   * Convert a character offset to line information
   */
  getLineInfo(offset: number): LineInfo | null {
    if (offset < 0 || offset > this.lineStartOffsets[this.lineStartOffsets.length - 1] + this.lines[this.lines.length - 1].length) {
      return null;
    }

    // Find the line containing this offset
    let lineIndex = 0;
    while (
      lineIndex < this.lineStartOffsets.length - 1 &&
      this.lineStartOffsets[lineIndex + 1] <= offset
    ) {
      lineIndex++;
    }

    const positionInLine = offset - this.lineStartOffsets[lineIndex];
    
    return {
      lineNumber: lineIndex + 1,
      lineIndex,
      positionInLine,
      lineText: this.lines[lineIndex]
    };
  }

  /**
   * Convert character offset range to location information
   */
  getLocationInfo(startOffset: number, endOffset: number): LocationInfo | null {
    const startInfo = this.getLineInfo(startOffset);
    const endInfo = this.getLineInfo(endOffset);
    
    if (!startInfo || !endInfo) {
      return null;
    }

    // Extract the text between offsets
    const text = this.getTextBetween(startOffset, endOffset);
    
    return {
      start: startInfo,
      end: endInfo,
      text
    };
  }

  /**
   * Get text between two character offsets
   */
  private getTextBetween(startOffset: number, endOffset: number): string {
    // Reconstruct from lines to handle newlines correctly
    const startInfo = this.getLineInfo(startOffset);
    const endInfo = this.getLineInfo(endOffset);
    
    if (!startInfo || !endInfo) {
      return '';
    }

    if (startInfo.lineIndex === endInfo.lineIndex) {
      // Same line
      return startInfo.lineText.substring(startInfo.positionInLine, endInfo.positionInLine);
    }

    // Multiple lines
    let result = startInfo.lineText.substring(startInfo.positionInLine) + '\n';
    
    // Add complete lines in between
    for (let i = startInfo.lineIndex + 1; i < endInfo.lineIndex; i++) {
      result += this.lines[i] + '\n';
    }
    
    // Add part of the last line
    result += endInfo.lineText.substring(0, endInfo.positionInLine);
    
    return result;
  }

  /**
   * Get a snippet of text around a position for context
   */
  getContextSnippet(offset: number, beforeChars: number = 20, afterChars: number = 20): string {
    const lineInfo = this.getLineInfo(offset);
    if (!lineInfo) return '';

    const line = lineInfo.lineText;
    const pos = lineInfo.positionInLine;
    
    const start = Math.max(0, pos - beforeChars);
    const end = Math.min(line.length, pos + afterChars);
    
    return line.substring(start, end);
  }

  /**
   * Find text within a specific line range
   * Returns the character offsets if found
   */
  findTextInLineRange(
    text: string, 
    startLine: number, 
    endLine: number
  ): { startOffset: number; endOffset: number } | null {
    const startLineIndex = startLine - 1;
    const endLineIndex = endLine - 1;
    
    if (startLineIndex < 0 || endLineIndex >= this.lines.length) {
      return null;
    }

    // Search within the specified line range
    for (let lineIndex = startLineIndex; lineIndex <= endLineIndex; lineIndex++) {
      const line = this.lines[lineIndex];
      const position = line.indexOf(text);
      
      if (position !== -1) {
        const startOffset = this.lineStartOffsets[lineIndex] + position;
        const endOffset = startOffset + text.length;
        return { startOffset, endOffset };
      }
    }

    // Try case-insensitive search as fallback
    const lowerText = text.toLowerCase();
    for (let lineIndex = startLineIndex; lineIndex <= endLineIndex; lineIndex++) {
      const line = this.lines[lineIndex];
      const position = line.toLowerCase().indexOf(lowerText);
      
      if (position !== -1) {
        const startOffset = this.lineStartOffsets[lineIndex] + position;
        const endOffset = startOffset + text.length;
        return { startOffset, endOffset };
      }
    }

    return null;
  }

  /**
   * Find location information for a text match within a chunk
   */
  static findLocation(
    text: string,
    chunk: TextChunk,
    startSearchFrom: number = 0
  ): LocationInfoExtended | null {
    const chunkLocationUtils = new LocationUtils(chunk.text);
    const textPosition = chunk.text.indexOf(text, startSearchFrom);
    
    if (textPosition === -1) {
      return null;
    }

    const locationInfo = chunkLocationUtils.getLocationInfo(
      textPosition,
      textPosition + text.length
    );

    if (!locationInfo) {
      return null;
    }

    const result: LocationInfoExtended = {
      position: {
        start: textPosition,
        end: textPosition + text.length
      }
    };

    // Calculate absolute line numbers if chunk has global line info
    if (chunk.metadata?.lineInfo) {
      result.lineNumber = chunk.metadata.lineInfo.startLine + locationInfo.start.lineNumber - 1;
      result.startLine = result.lineNumber;
      result.endLine = chunk.metadata.lineInfo.startLine + locationInfo.end.lineNumber - 1;
    } else {
      // Use chunk-relative line numbers
      result.lineNumber = locationInfo.start.lineNumber;
      result.startLine = locationInfo.start.lineNumber;
      result.endLine = locationInfo.end.lineNumber;
    }

    result.lineText = locationInfo.start.lineText;

    return result;
  }

  /**
   * Add location hint to a finding
   */
  static addLocationHint(
    finding: Finding,
    text: string,
    chunk: TextChunk,
    startSearchFrom: number = 0
  ): Finding {
    const location = this.findLocation(text, chunk, startSearchFrom);
    
    if (location && location.lineNumber && location.lineText) {
      finding.locationHint = {
        lineNumber: location.lineNumber,
        lineText: location.lineText,
        matchText: text,
        startLineNumber: location.startLine,
        endLineNumber: location.endLine
      };
    }

    if (location?.position) {
      finding.location = location.position;
    }

    return finding;
  }

  /**
   * Create a finding with automatic location tracking
   */
  static createFindingWithLocation(
    type: string,
    severity: 'low' | 'medium' | 'high' | 'info',
    message: string,
    matchText: string,
    chunk: TextChunk,
    metadata?: Record<string, any>
  ): Finding {
    const finding: Finding = {
      type,
      severity,
      message,
      metadata: {
        ...metadata,
        chunkId: chunk.id
      }
    };

    return this.addLocationHint(finding, matchText, chunk);
  }

  /**
   * Find all occurrences of a text in a chunk
   */
  static findAllLocations(
    text: string,
    chunk: TextChunk
  ): LocationInfoExtended[] {
    const locations: LocationInfoExtended[] = [];
    let searchFrom = 0;
    
    while (true) {
      const location = this.findLocation(text, chunk, searchFrom);
      if (!location || !location.position) break;
      
      locations.push(location);
      searchFrom = location.position.end;
    }
    
    return locations;
  }

  /**
   * Get location info for a specific character range in a chunk
   */
  static getLocationForRange(
    start: number,
    end: number,
    chunk: TextChunk
  ): LocationInfoExtended | null {
    const chunkLocationUtils = new LocationUtils(chunk.text);
    const locationInfo = chunkLocationUtils.getLocationInfo(start, end);

    if (!locationInfo) {
      return null;
    }

    const result: LocationInfoExtended = {
      position: { start, end }
    };

    // Calculate absolute line numbers if chunk has global line info
    if (chunk.metadata?.lineInfo) {
      result.lineNumber = chunk.metadata.lineInfo.startLine + locationInfo.start.lineNumber - 1;
      result.startLine = result.lineNumber;
      result.endLine = chunk.metadata.lineInfo.startLine + locationInfo.end.lineNumber - 1;
    } else {
      // Use chunk-relative line numbers
      result.lineNumber = locationInfo.start.lineNumber;
      result.startLine = locationInfo.start.lineNumber;
      result.endLine = locationInfo.end.lineNumber;
    }

    result.lineText = locationInfo.start.lineText;

    return result;
  }
}