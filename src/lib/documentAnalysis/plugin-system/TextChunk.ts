/**
 * Implementation of TextChunk with helper methods
 */

import { TextChunk as ITextChunk } from './types';

export class TextChunk implements ITextChunk {
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
    }
  ) {}

  getContext(position: number, windowSize: number = 50): string {
    const start = Math.max(0, position - windowSize);
    const end = Math.min(this.text.length, position + windowSize);
    return this.text.slice(start, end);
  }

  getTextBefore(length: number): string {
    return this.text.slice(0, length);
  }

  getTextAfter(length: number): string {
    return this.text.slice(-length);
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

  if (chunkByParagraphs) {
    // Split by double newlines (paragraphs)
    const paragraphs = text.split(/\n\n+/);
    let position = 0;

    paragraphs.forEach((para, index) => {
      if (para.trim()) {
        chunks.push(new TextChunk(
          `chunk-${index}`,
          para.trim(),
          {
            position: {
              start: position,
              end: position + para.length
            }
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

      chunks.push(new TextChunk(
        `chunk-${chunkIndex}`,
        chunkText,
        {
          position: {
            start: position,
            end: end
          }
        }
      ));

      position += chunkSize - overlap;
      chunkIndex++;
    }
  }

  return chunks;
}