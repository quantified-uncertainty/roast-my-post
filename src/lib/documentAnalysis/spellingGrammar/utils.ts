import type { ChunkWithLineNumbers } from "./types";

/**
 * Split document content into chunks with line number tracking
 */
export function splitIntoChunks(
  content: string,
  maxChunkSize: number = 3000
): ChunkWithLineNumbers[] {
  const lines = content.split('\n');
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

/**
 * Calculate character offset for a given line number in the full content
 */
export function getCharacterOffsetForLine(content: string, lineNumber: number): number {
  const lines = content.split('\n');
  let offset = 0;
  
  for (let i = 0; i < lineNumber - 1 && i < lines.length; i++) {
    offset += lines[i].length + 1; // +1 for newline
  }
  
  return offset;
}

/**
 * Get emoji for error group based on severity and type
 */
export function getErrorGroupEmoji(errorGroup: { severity: string; errorType: string }): string {
  // High severity - critical errors that must be fixed
  if (errorGroup.severity === 'high') {
    if (errorGroup.errorType === 'spelling') return '🔴';
    if (errorGroup.errorType === 'grammar') return '❌';
    if (errorGroup.errorType === 'word_choice') return '⚠️';
    return '‼️';
  }
  
  // Medium severity
  if (errorGroup.severity === 'medium') {
    if (errorGroup.errorType === 'capitalization') return '🔤';
    if (errorGroup.errorType === 'punctuation') return '📍';
    if (errorGroup.errorType === 'consistency') return '🔄';
    return '⚡';
  }
  
  // Low severity
  if (errorGroup.errorType === 'punctuation') return '💭';
  if (errorGroup.errorType === 'other') return '💡';
  return '📌';
}

/**
 * Get error type label for inline format
 */
export function getErrorTypeLabel(errorType: string): string {
  switch (errorType) {
    case 'spelling':
      return 'Spelling';
    case 'grammar':
      return 'Grammar';
    case 'punctuation':
      return 'Punctuation';
    case 'capitalization':
      return 'Capitalization';
    case 'word_choice':
      return 'Word choice';
    case 'consistency':
      return 'Consistency';
    case 'other':
      return 'Style';
    default:
      return 'Error';
  }
}