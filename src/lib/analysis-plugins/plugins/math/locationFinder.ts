import { logger } from "../../../logger";

interface LocationResult {
  startOffset: number;
  endOffset: number;
  quotedText: string;
}

interface FindOptions {
  allowPartialMatch?: boolean;
  normalizeWhitespace?: boolean;
}

/**
 * Normalize text for math expression matching
 */
function normalizeForMatching(text: string, options: FindOptions): string {
  let normalized = text;
  
  if (options.normalizeWhitespace) {
    // Normalize various whitespace to single spaces
    normalized = normalized.replace(/\s+/g, ' ').trim();
  }
  
  return normalized;
}

/**
 * Find the location of a math expression in a text chunk
 */
export function findMathLocation(
  mathExpression: string,
  chunkText: string,
  options: FindOptions = {}
): LocationResult | null {
  const normalizedExpression = normalizeForMatching(mathExpression, options);
  const normalizedChunk = normalizeForMatching(chunkText, options);
  
  // First try exact match in normalized text
  let startIndex = normalizedChunk.indexOf(normalizedExpression);
  
  // If not found and partial match is allowed, try fuzzy matching
  if (startIndex === -1 && options.allowPartialMatch) {
    // Try to find key parts of the expression
    const keyParts = extractKeyParts(normalizedExpression);
    
    for (const part of keyParts) {
      const partIndex = normalizedChunk.indexOf(part);
      if (partIndex !== -1) {
        // Found a key part, try to expand to full expression
        const expandedMatch = expandToFullExpression(
          normalizedChunk,
          partIndex,
          part,
          normalizedExpression
        );
        
        if (expandedMatch) {
          startIndex = expandedMatch.start;
          break;
        }
      }
    }
  }
  
  if (startIndex === -1) {
    logger.debug(`Math expression not found in chunk: "${mathExpression}"`);
    return null;
  }
  
  // Map back to original text positions
  const originalPosition = mapToOriginalPosition(
    chunkText,
    normalizedChunk,
    startIndex,
    normalizedExpression.length
  );
  
  if (!originalPosition) {
    return null;
  }
  
  return {
    startOffset: originalPosition.start,
    endOffset: originalPosition.end,
    quotedText: chunkText.substring(originalPosition.start, originalPosition.end),
  };
}

/**
 * Extract key parts from a math expression for fuzzy matching
 */
function extractKeyParts(expression: string): string[] {
  const parts: string[] = [];
  
  // Extract numbers with surrounding operators
  const numberPattern = /[\d.,]+\s*[+\-*/=<>]\s*[\d.,]+/g;
  const matches = expression.match(numberPattern);
  if (matches) {
    parts.push(...matches);
  }
  
  // Extract variable assignments
  const assignmentPattern = /\w+\s*=\s*[\d.,]+/g;
  const assignments = expression.match(assignmentPattern);
  if (assignments) {
    parts.push(...assignments);
  }
  
  // If no specific patterns found, use the whole expression
  if (parts.length === 0) {
    parts.push(expression);
  }
  
  return parts;
}

/**
 * Try to expand a partial match to the full expression
 */
function expandToFullExpression(
  text: string,
  partStart: number,
  part: string,
  fullExpression: string
): { start: number; end: number } | null {
  // Look for mathematical boundaries before and after the part
  const beforeBoundary = /[\s,.()\[\]{};:"']|^/;
  const afterBoundary = /[\s,.()\[\]{};:"']|$/;
  
  let start = partStart;
  let end = partStart + part.length;
  
  // Expand backwards
  while (start > 0 && !beforeBoundary.test(text[start - 1])) {
    start--;
  }
  
  // Expand forwards
  while (end < text.length && !afterBoundary.test(text[end])) {
    end++;
  }
  
  // Check if the expanded text is reasonable
  const expandedText = text.substring(start, end);
  if (expandedText.length > fullExpression.length * 1.5) {
    // Expanded too much, probably not the right match
    return null;
  }
  
  return { start, end };
}

/**
 * Map positions from normalized text back to original text
 */
function mapToOriginalPosition(
  originalText: string,
  normalizedText: string,
  normalizedStart: number,
  normalizedLength: number
): { start: number; end: number } | null {
  let originalPos = 0;
  let normalizedPos = 0;
  let foundStart = -1;
  let foundEnd = -1;
  
  while (originalPos < originalText.length && normalizedPos <= normalizedStart + normalizedLength) {
    if (normalizedPos === normalizedStart) {
      foundStart = originalPos;
    }
    
    if (normalizedPos === normalizedStart + normalizedLength) {
      foundEnd = originalPos;
      break;
    }
    
    // Skip whitespace in original that was normalized
    if (/\s/.test(originalText[originalPos])) {
      // Check if this whitespace exists in normalized
      if (normalizedPos < normalizedText.length && normalizedText[normalizedPos] === ' ') {
        normalizedPos++;
        originalPos++;
      } else {
        // This whitespace was removed in normalization
        originalPos++;
      }
    } else {
      // Non-whitespace character
      if (normalizedPos < normalizedText.length && 
          originalText[originalPos] === normalizedText[normalizedPos]) {
        normalizedPos++;
        originalPos++;
      } else {
        // Mismatch - something went wrong
        return null;
      }
    }
  }
  
  if (foundStart === -1 || foundEnd === -1) {
    return null;
  }
  
  return { start: foundStart, end: foundEnd };
}