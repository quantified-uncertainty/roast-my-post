/**
 * Utility functions for finding text locations in documents
 */

import type { Comment } from '@/types/documentSchema';
import type { HighlightHint } from '../types';

export interface LocationResult {
  highlight: Comment['highlight'] | null;
  confidence: number;
}

/**
 * Try to locate text in a document using various matching strategies
 */
export function findTextLocation(
  searchText: string,
  documentText: string,
  options?: {
    lineNumber?: number;
    fuzzyMatch?: boolean;
    maxDistance?: number;
  }
): LocationResult {
  const { fuzzyMatch = true, maxDistance = 100 } = options || {};
  
  // Try exact match first
  let position = documentText.indexOf(searchText);
  let confidence = 1.0;
  
  // If no exact match and fuzzy matching enabled, try normalized match
  if (position === -1 && fuzzyMatch) {
    const normalizedSearch = normalizeText(searchText);
    const normalizedDoc = normalizeText(documentText);
    position = normalizedDoc.indexOf(normalizedSearch);
    
    if (position !== -1) {
      // Map back to original document position (approximate)
      position = findOriginalPosition(documentText, normalizedSearch, position);
      confidence = 0.9;
    }
  }
  
  // If still no match, try partial match (first few words)
  if (position === -1 && fuzzyMatch && searchText.length > 20) {
    const words = searchText.split(/\s+/).slice(0, 5).join(' ');
    position = documentText.indexOf(words);
    if (position !== -1) {
      confidence = 0.7;
    }
  }
  
  // If we have a line number hint, try to find near that line
  if (position === -1 && options?.lineNumber) {
    position = findNearLine(documentText, searchText, options.lineNumber, maxDistance);
    if (position !== -1) {
      confidence = 0.8;
    }
  }
  
  if (position === -1) {
    return { highlight: null, confidence: 0 };
  }
  
  // Calculate actual end position based on what we found
  const actualEndPosition = position + searchText.length;
  
  return {
    highlight: {
      startOffset: position,
      endOffset: actualEndPosition,
      quotedText: documentText.substring(position, actualEndPosition),
      isValid: true
    },
    confidence
  };
}

/**
 * Find text near a specific line number
 */
function findNearLine(
  documentText: string,
  searchText: string,
  targetLine: number,
  maxDistance: number
): number {
  const lines = documentText.split('\n');
  const startLine = Math.max(0, targetLine - maxDistance);
  const endLine = Math.min(lines.length, targetLine + maxDistance);
  
  // Build text window around target line
  let currentPos = 0;
  for (let i = 0; i < startLine; i++) {
    currentPos += lines[i].length + 1; // +1 for newline
  }
  
  const windowText = lines.slice(startLine, endLine).join('\n');
  const relativePos = windowText.indexOf(searchText);
  
  if (relativePos !== -1) {
    return currentPos + relativePos;
  }
  
  // Try normalized search in window
  const normalizedSearch = normalizeText(searchText);
  const normalizedWindow = normalizeText(windowText);
  const normalizedPos = normalizedWindow.indexOf(normalizedSearch);
  
  if (normalizedPos !== -1) {
    // Approximate position
    return currentPos + normalizedPos;
  }
  
  return -1;
}

/**
 * Normalize text for fuzzy matching
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[.,;:!?'"()-]/g, '')
    .trim();
}

/**
 * Find original position from normalized position (approximate)
 */
function findOriginalPosition(
  originalText: string,
  searchWords: string,
  normalizedPosition: number
): number {
  // This is a simplified approach - a more sophisticated version
  // would maintain a position mapping during normalization
  const words = searchWords.split(' ');
  const firstWord = words[0];
  
  // Find the first word near the normalized position
  let searchStart = Math.max(0, normalizedPosition - 50);
  let position = originalText.toLowerCase().indexOf(firstWord, searchStart);
  
  if (position === -1) {
    // Fallback to approximate position
    return Math.min(normalizedPosition, originalText.length - 1);
  }
  
  return position;
}

/**
 * Convert a highlight hint to a located finding
 */
export function locateFinding(
  hint: HighlightHint,
  documentText: string,
  options?: {
    fuzzyMatch?: boolean;
    requireHighConfidence?: boolean;
  }
): Comment['highlight'] | null {
  const { requireHighConfidence = false } = options || {};
  
  const result = findTextLocation(hint.searchText, documentText, {
    lineNumber: hint.lineNumber,
    fuzzyMatch: options?.fuzzyMatch
  });
  
  if (requireHighConfidence && result.confidence < 0.9) {
    return null;
  }
  
  return result.highlight;
}

/**
 * Batch locate multiple findings efficiently
 */
export function batchLocateFindings(
  hints: HighlightHint[],
  documentText: string,
  options?: {
    fuzzyMatch?: boolean;
    requireHighConfidence?: boolean;
  }
): Map<string, Comment['highlight'] | null> {
  const results = new Map<string, Comment['highlight'] | null>();
  
  // Could be optimized with better data structures for large documents
  hints.forEach(hint => {
    const location = locateFinding(hint, documentText, options);
    results.set(hint.searchText, location);
  });
  
  return results;
}