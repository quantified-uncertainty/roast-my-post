/**
 * Efficient document processing utilities with caching
 */

import type { ChunkWithLineNumbers } from "./types";

/**
 * Document processor that caches expensive operations
 */
export class DocumentProcessor {
  private lines: string[] | null = null;
  private lineOffsets: number[] | null = null;
  private wordCount: number | null = null;
  
  constructor(private readonly content: string) {}
  
  /**
   * Get lines (cached after first call)
   */
  getLines(): string[] {
    if (!this.lines) {
      this.lines = this.content.split('\n');
    }
    return this.lines;
  }
  
  /**
   * Get line count
   */
  getLineCount(): number {
    return this.getLines().length;
  }
  
  /**
   * Get word count (cached after first call)
   */
  getWordCount(): number {
    if (this.wordCount === null) {
      this.wordCount = this.content.split(/\s+/).filter(word => word.length > 0).length;
    }
    return this.wordCount;
  }
  
  /**
   * Get character offset for a line (with caching)
   */
  getCharacterOffsetForLine(lineNumber: number): number {
    if (!this.lineOffsets) {
      this.calculateLineOffsets();
    }
    
    // Line numbers are 1-based
    const index = lineNumber - 1;
    if (index < 0 || index >= this.lineOffsets!.length) {
      return 0;
    }
    
    return this.lineOffsets![index];
  }
  
  /**
   * Calculate all line offsets once
   */
  private calculateLineOffsets(): void {
    const lines = this.getLines();
    this.lineOffsets = [0]; // First line starts at 0
    
    let offset = 0;
    for (let i = 0; i < lines.length - 1; i++) {
      offset += lines[i].length + 1; // +1 for newline
      this.lineOffsets.push(offset);
    }
  }
  
  /**
   * Get lines for a specific range
   */
  getLineRange(startLine: number, endLine: number): string[] {
    const lines = this.getLines();
    // Convert to 0-based index
    return lines.slice(startLine - 1, endLine);
  }
  
  /**
   * Get content for line range
   */
  getContentForLineRange(startLine: number, endLine: number): string {
    return this.getLineRange(startLine, endLine).join('\n');
  }
  
  /**
   * Split into chunks efficiently
   */
  splitIntoChunks(maxChunkSize: number = 3000): ChunkWithLineNumbers[] {
    const lines = this.getLines();
    const chunks: ChunkWithLineNumbers[] = [];
    
    let currentChunk: string[] = [];
    let currentChunkStartLine = 1;
    let currentChunkCharCount = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineLength = line.length + 1; // +1 for newline
      
      // If adding this line would exceed chunk size, create a new chunk
      if (currentChunkCharCount + lineLength > maxChunkSize && currentChunk.length > 0) {
        chunks.push({
          content: currentChunk.join('\n'),
          startLineNumber: currentChunkStartLine,
          lines: [...currentChunk]
        });
        
        currentChunk = [line];
        currentChunkStartLine = i + 1; // Line numbers are 1-based
        currentChunkCharCount = lineLength;
      } else {
        currentChunk.push(line);
        currentChunkCharCount += lineLength;
      }
    }
    
    // Don't forget the last chunk
    if (currentChunk.length > 0) {
      chunks.push({
        content: currentChunk.join('\n'),
        startLineNumber: currentChunkStartLine,
        lines: currentChunk
      });
    }
    
    return chunks;
  }
}