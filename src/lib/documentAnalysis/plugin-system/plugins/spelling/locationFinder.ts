import { logger } from "@/lib/logger";

interface LocationResult {
  startOffset: number;
  endOffset: number;
  quotedText: string;
}

interface FindOptions {
  allowPartialMatch?: boolean;
  context?: string;
}

/**
 * Find the location of a spelling error in a text chunk
 */
export function findSpellingErrorLocation(
  errorText: string,
  chunkText: string,
  options: FindOptions = {}
): LocationResult | null {
  // First try exact match
  let startIndex = chunkText.indexOf(errorText);
  
  if (startIndex !== -1) {
    return {
      startOffset: startIndex,
      endOffset: startIndex + errorText.length,
      quotedText: errorText,
    };
  }
  
  // If we have context and partial match is allowed, try to use it
  if (options.allowPartialMatch && options.context) {
    return findUsingContext(errorText, chunkText, options.context);
  }
  
  logger.debug(`Spelling error text not found in chunk: "${errorText}"`);
  return null;
}

/**
 * Try to find the error using surrounding context
 */
function findUsingContext(
  errorText: string,
  chunkText: string,
  context: string
): LocationResult | null {
  // Extract words before and after the error from context
  const contextLower = context.toLowerCase();
  const errorLower = errorText.toLowerCase();
  const errorIndex = contextLower.indexOf(errorLower);
  
  if (errorIndex === -1) {
    return null;
  }
  
  // Get a few words before the error
  const beforeStart = Math.max(0, errorIndex - 20);
  const beforeText = context.substring(beforeStart, errorIndex).trim();
  const beforeWords = beforeText.split(/\s+/).slice(-2).join(' ');
  
  // Get a few words after the error
  const afterEnd = Math.min(context.length, errorIndex + errorText.length + 20);
  const afterText = context.substring(errorIndex + errorText.length, afterEnd).trim();
  const afterWords = afterText.split(/\s+/).slice(0, 2).join(' ');
  
  // Try to find this pattern in the chunk
  if (beforeWords) {
    const patternWithBefore = beforeWords + ' ' + errorText;
    const patternIndex = chunkText.indexOf(patternWithBefore);
    if (patternIndex !== -1) {
      const errorStart = patternIndex + beforeWords.length + 1;
      return {
        startOffset: errorStart,
        endOffset: errorStart + errorText.length,
        quotedText: errorText,
      };
    }
  }
  
  if (afterWords) {
    const patternWithAfter = errorText + ' ' + afterWords;
    const patternIndex = chunkText.indexOf(patternWithAfter);
    if (patternIndex !== -1) {
      return {
        startOffset: patternIndex,
        endOffset: patternIndex + errorText.length,
        quotedText: errorText,
      };
    }
  }
  
  // Last resort: case-insensitive search
  const chunkLower = chunkText.toLowerCase();
  const errorIndexInChunk = chunkLower.indexOf(errorLower);
  if (errorIndexInChunk !== -1) {
    return {
      startOffset: errorIndexInChunk,
      endOffset: errorIndexInChunk + errorText.length,
      quotedText: chunkText.substring(errorIndexInChunk, errorIndexInChunk + errorText.length),
    };
  }
  
  return null;
}