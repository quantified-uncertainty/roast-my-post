/**
 * Math-specific location finding utilities
 */

import type { Comment } from '@/types/documentSchema';

/**
 * Normalize mathematical expressions for matching
 * Preserves mathematical operators and structure
 */
export function normalizeMathExpression(expr: string): string {
  return expr
    .trim()
    // Normalize whitespace around operators but preserve them
    .replace(/\s*([+\-*/=<>≤≥≠×÷±∓∞∑∏∫∂∇])\s*/g, ' $1 ')
    // Normalize multiple spaces to single space
    .replace(/\s+/g, ' ')
    // Remove spaces inside parentheses at start/end
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    // Normalize common math variations
    .replace(/\*\*/g, '^')  // ** to ^
    .replace(/\b([0-9]+)\s*x\s*([0-9]+)/g, '$1 × $2')  // Only replace x between numbers
    .replace(/\s*\^\s*/g, '^')  // Remove spaces around exponents
    .trim();
}

/**
 * Find math expression in text with math-aware fuzzy matching
 */
export function findMathLocation(
  searchExpr: string,
  documentText: string,
  options?: {
    allowNormalization?: boolean;
    contextWords?: number;
  }
): Comment['highlight'] | null {
  const { allowNormalization = true, contextWords = 10 } = options || {};
  
  // Try exact match first
  let position = documentText.indexOf(searchExpr);
  
  if (position === -1 && allowNormalization) {
    // Try with normalized math expressions
    const normalizedSearch = normalizeMathExpression(searchExpr);
    const normalizedDoc = documentText
      .split('\n')
      .map(line => {
        const normalizedLine = normalizeMathExpression(line);
        return { original: line, normalized: normalizedLine };
      });
    
    // Find in normalized version
    for (let i = 0; i < normalizedDoc.length; i++) {
      const linePos = normalizedDoc[i].normalized.indexOf(normalizedSearch);
      if (linePos !== -1) {
        // Found it! Now find position in original text
        const linesBeforeTarget = documentText.split('\n').slice(0, i);
        const charsBeforeTarget = linesBeforeTarget.join('\n').length + (i > 0 ? 1 : 0);
        
        // Try to find the exact position in the original line
        const originalLine = normalizedDoc[i].original;
        position = findBestMatchInLine(searchExpr, originalLine, linePos);
        
        if (position !== -1) {
          position += charsBeforeTarget;
        }
        break;
      }
    }
  }
  
  // If still not found, try finding key numbers/variables
  if (position === -1 && searchExpr.length > 3) {
    // Extract numbers and variables from the expression
    const keyParts = extractKeyParts(searchExpr);
    if (keyParts.length >= 2) {
      // Try to find a sequence of these key parts
      position = findKeyPartsSequence(keyParts, documentText, contextWords);
    }
  }
  
  if (position === -1) {
    return null;
  }
  
  // Calculate end position - try to capture the full expression
  const endPosition = findExpressionEnd(documentText, position, searchExpr.length);
  
  return {
    startOffset: position,
    endOffset: endPosition,
    quotedText: documentText.substring(position, endPosition),
    isValid: true
  };
}

/**
 * Find the best match for an expression within a line
 */
function findBestMatchInLine(
  searchExpr: string,
  line: string,
  normalizedPos: number
): number {
  // Try exact match first
  const exactPos = line.indexOf(searchExpr);
  if (exactPos !== -1) return exactPos;
  
  // Otherwise, use the normalized position as a guide
  // This is approximate but better than nothing
  return Math.min(normalizedPos, line.length - 1);
}

/**
 * Extract key parts (numbers, variables) from a math expression
 */
function extractKeyParts(expr: string): string[] {
  const parts: string[] = [];
  
  // Extract numbers (including decimals and scientific notation)
  const numbers = expr.match(/\d+\.?\d*(?:[eE][+-]?\d+)?/g) || [];
  parts.push(...numbers);
  
  // Extract variables (single letters)
  const variables = expr.match(/\b[a-zA-Z]\b/g) || [];
  parts.push(...variables);
  
  // Extract special constants
  const constants = expr.match(/\b(?:pi|π|e|∞)\b/gi) || [];
  parts.push(...constants);
  
  return parts.filter((p, i, arr) => arr.indexOf(p) === i); // unique
}

/**
 * Find a sequence of key parts within context
 */
function findKeyPartsSequence(
  keyParts: string[],
  text: string,
  contextWords: number
): number {
  if (keyParts.length < 2) return -1;
  
  // Find first key part
  let pos = text.indexOf(keyParts[0]);
  while (pos !== -1) {
    // Check if other key parts are nearby
    const contextStart = Math.max(0, pos - contextWords * 5);
    const contextEnd = Math.min(text.length, pos + contextWords * 10);
    const context = text.substring(contextStart, contextEnd);
    
    // Check if at least 60% of key parts are in the context
    const foundParts = keyParts.filter(part => context.includes(part));
    if (foundParts.length >= Math.ceil(keyParts.length * 0.6)) {
      return pos;
    }
    
    // Try next occurrence
    pos = text.indexOf(keyParts[0], pos + 1);
  }
  
  return -1;
}

/**
 * Find where a math expression likely ends
 */
function findExpressionEnd(
  text: string,
  startPos: number,
  minLength: number
): number {
  let endPos = startPos + minLength;
  
  // Extend to capture the full expression
  const mathChars = /[0-9a-zA-Z+\-*/=<>≤≥≠×÷±∓∞∑∏∫∂∇^()[\]{}.,\s]/;
  
  while (endPos < text.length && mathChars.test(text[endPos])) {
    endPos++;
  }
  
  // Trim trailing whitespace
  while (endPos > startPos && /\s/.test(text[endPos - 1])) {
    endPos--;
  }
  
  return Math.max(endPos, startPos + minLength);
}