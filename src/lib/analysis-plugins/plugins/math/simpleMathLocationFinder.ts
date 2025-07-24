/**
 * Simplified math location finder - focused on what actually works
 */

import { logger } from "../../../logger";

interface LocationResult {
  startOffset: number;
  endOffset: number;
  quotedText: string;
}

/**
 * Find math expression in text - simple and effective
 */
export function findMathLocation(
  mathExpression: string,
  chunkText: string
): LocationResult | null {
  // Strategy 1: Exact match
  let startOffset = chunkText.indexOf(mathExpression);
  
  // Strategy 2: Normalized whitespace (math often has space variations)
  if (startOffset === -1) {
    const normalizedExpr = mathExpression.replace(/\s+/g, ' ').trim();
    const normalizedChunk = chunkText.replace(/\s+/g, ' ');
    const normalizedOffset = normalizedChunk.indexOf(normalizedExpr);
    
    if (normalizedOffset !== -1) {
      // Map back to original position (approximate)
      startOffset = chunkText.indexOf(mathExpression.trim());
      if (startOffset === -1) {
        // Use the normalized position as fallback
        startOffset = normalizedOffset;
      }
    }
  }
  
  // Strategy 3: Key number matching (for partial expressions)
  if (startOffset === -1 && mathExpression.length > 20) {
    // Extract distinctive numbers
    const numbers = mathExpression.match(/\d+\.?\d*/g);
    if (numbers) {
      // Find the most distinctive number (longest or with decimal)
      const distinctiveNumber = numbers
        .filter(n => n.includes('.') || n.length > 2)
        .sort((a, b) => b.length - a.length)[0];
      
      if (distinctiveNumber) {
        startOffset = chunkText.indexOf(distinctiveNumber);
      }
    }
  }
  
  if (startOffset === -1) {
    logger.debug('Math expression not found', { 
      expression: mathExpression.slice(0, 50) 
    });
    return null;
  }
  
  // Use the original expression length for the end offset
  const endOffset = startOffset + mathExpression.length;
  
  return {
    startOffset,
    endOffset,
    quotedText: chunkText.substring(startOffset, endOffset)
  };
}