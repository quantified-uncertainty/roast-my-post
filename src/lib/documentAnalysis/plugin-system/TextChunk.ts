/**
 * Implementation of TextChunk with helper methods
 */

import { TextChunk as ITextChunk } from './types';
import { LocationUtils } from '../utils/LocationUtils';

export class TextChunk implements ITextChunk {
  private locationUtils: LocationUtils;

  constructor(
    public id: string,
    public text: string,
    public metadata?: {
      section?: string;
      pageNumber?: number;
      position: {
        start: number;
        end: number;
      };
      lineInfo?: {
        startLine: number;
        endLine: number;
        totalLines: number;
      };
    }
  ) {
    this.locationUtils = new LocationUtils(this.text);
  }

  getContext(position: number, windowSize: number = 50): string {
    const start = Math.max(0, position - windowSize);
    const end = Math.min(this.text.length, position + windowSize);
    return this.text.slice(start, end);
  }


  getExpandedContext(wordsAround: number = 100): string {
    // Get context by words instead of characters
    const words = this.text.split(/\s+/);
    const totalWords = words.length;
    
    // For simplicity, take words from beginning and end
    const wordsFromStart = Math.floor(wordsAround / 2);
    const wordsFromEnd = Math.floor(wordsAround / 2);
    
    if (totalWords <= wordsAround) {
      return this.text;
    }
    
    const startWords = words.slice(0, wordsFromStart);
    const endWords = words.slice(-wordsFromEnd);
    
    return `${startWords.join(' ')} [...] ${endWords.join(' ')}`;
  }

  getLineNumber(charOffset: number): number | null {
    // Convert character offset within this chunk to line number
    const lineInfo = this.locationUtils.getLineInfo(charOffset);
    if (!lineInfo) return null;
    
    // If we have global line info, adjust the line number
    if (this.metadata?.lineInfo) {
      // lineInfo.lineNumber is 1-based within the chunk
      // We need to add it to the starting line of the chunk
      return this.metadata.lineInfo.startLine + lineInfo.lineNumber - 1;
    }
    
    // Otherwise return the line number within the chunk
    return lineInfo.lineNumber;
  }
}

/**
 * Create chunks from a document
 */
export function createChunks(
  text: string,
  options: {
    chunkSize?: number;
    overlap?: number;
    chunkByParagraphs?: boolean;
  } = {}
): TextChunk[] {
  const {
    chunkSize = 1000,
    overlap = 100,
    chunkByParagraphs = false
  } = options;

  const chunks: TextChunk[] = [];
  
  // Create location utils for the full document to get accurate line numbers
  const docLocationUtils = new LocationUtils(text);

  if (chunkByParagraphs) {
    // Split by double newlines (paragraphs)
    const paragraphs = text.split(/\n\n+/);
    let position = 0;

    paragraphs.forEach((para, index) => {
      if (para.trim()) {
        const startInfo = docLocationUtils.getLineInfo(position);
        const endInfo = docLocationUtils.getLineInfo(position + para.length);
        
        chunks.push(new TextChunk(
          `chunk-${index}`,
          para.trim(),
          {
            position: {
              start: position,
              end: position + para.length
            },
            lineInfo: startInfo && endInfo ? {
              startLine: startInfo.lineNumber,
              endLine: endInfo.lineNumber,
              totalLines: endInfo.lineNumber - startInfo.lineNumber + 1
            } : undefined
          }
        ));
      }
      position += para.length + 2; // +2 for the double newline
    });
  } else {
    // Fixed-size chunks with overlap
    let position = 0;
    let chunkIndex = 0;

    while (position < text.length) {
      const end = Math.min(position + chunkSize, text.length);
      const chunkText = text.slice(position, end);
      
      const startInfo = docLocationUtils.getLineInfo(position);
      const endInfo = docLocationUtils.getLineInfo(end - 1); // -1 to get the last actual character

      chunks.push(new TextChunk(
        `chunk-${chunkIndex}`,
        chunkText,
        {
          position: {
            start: position,
            end: end
          },
          lineInfo: startInfo && endInfo ? {
            startLine: startInfo.lineNumber,
            endLine: endInfo.lineNumber,
            totalLines: endInfo.lineNumber - startInfo.lineNumber + 1
          } : undefined
        }
      ));

      position += chunkSize - overlap;
      chunkIndex++;
    }
  }

  return chunks;
}