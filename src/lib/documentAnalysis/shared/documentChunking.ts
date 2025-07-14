/**
 * Shared utilities for document chunking
 */

export interface ChunkMetadata {
  content: string;
  startLineNumber: number;
  endLineNumber: number;
  lines: string[];
  characterCount: number;
}

/**
 * Configuration for chunking behavior
 */
export interface ChunkingOptions {
  maxChunkSize?: number;
  preferParagraphBoundaries?: boolean;
  minChunkSize?: number;
}

/**
 * Split a document into chunks with metadata
 */
export function createDocumentChunks(
  content: string,
  options: ChunkingOptions = {}
): ChunkMetadata[] {
  const {
    maxChunkSize = 3000,
    preferParagraphBoundaries = true,
    minChunkSize = 500
  } = options;

  const lines = content.split('\n');
  const chunks: ChunkMetadata[] = [];
  
  let currentChunkLines: string[] = [];
  let currentChunkStartLine = 1;
  let currentChunkCharCount = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineLength = line.length + 1; // +1 for newline
    
    const shouldStartNewChunk = 
      currentChunkCharCount + lineLength > maxChunkSize && 
      currentChunkLines.length > 0 &&
      currentChunkCharCount >= minChunkSize;

    if (shouldStartNewChunk) {
      // If preferring paragraph boundaries, try to break at an empty line
      if (preferParagraphBoundaries && line.trim() === '') {
        // Perfect - break here at paragraph boundary
        chunks.push(createChunk(
          currentChunkLines,
          currentChunkStartLine,
          currentChunkStartLine + currentChunkLines.length - 1
        ));
        
        currentChunkLines = [];
        currentChunkStartLine = i + 2; // Skip the empty line
        currentChunkCharCount = 0;
        continue;
      }
      
      // Otherwise break at current position
      chunks.push(createChunk(
        currentChunkLines,
        currentChunkStartLine,
        currentChunkStartLine + currentChunkLines.length - 1
      ));
      
      currentChunkLines = [line];
      currentChunkStartLine = i + 1;
      currentChunkCharCount = lineLength;
    } else {
      currentChunkLines.push(line);
      currentChunkCharCount += lineLength;
    }
  }
  
  // Add the last chunk if it has content
  if (currentChunkLines.length > 0) {
    chunks.push(createChunk(
      currentChunkLines,
      currentChunkStartLine,
      currentChunkStartLine + currentChunkLines.length - 1
    ));
  }
  
  return chunks;
}

/**
 * Create a chunk metadata object
 */
function createChunk(
  lines: string[],
  startLine: number,
  endLine: number
): ChunkMetadata {
  const content = lines.join('\n');
  return {
    content,
    startLineNumber: startLine,
    endLineNumber: endLine,
    lines: [...lines],
    characterCount: content.length
  };
}

/**
 * Calculate character offset for a given line number
 */
export function getCharacterOffsetForLine(content: string, lineNumber: number): number {
  const lines = content.split('\n');
  let offset = 0;
  
  for (let i = 0; i < lineNumber - 1 && i < lines.length; i++) {
    offset += lines[i].length + 1; // +1 for newline
  }
  
  return offset;
}