/**
 * Core text location finding logic
 * Self-contained implementation that doesn't depend on documentAnalysis
 */

import { logger } from "@/lib/logger";

export interface TextLocation {
  startOffset: number;
  endOffset: number;
  quotedText: string;
  lineNumber: number;
  lineText: string;
  strategy: string;
  confidence: number;
}

export interface SimpleLocationOptions {
  normalizeQuotes?: boolean;
  partialMatch?: boolean;
  context?: string;
}

export interface EnhancedLocationOptions extends SimpleLocationOptions {
  maxDistance?: number;
  caseSensitive?: boolean;
  useLLMFallback?: boolean;
  pluginName?: string;
  documentText?: string;
}

export interface DocumentLocation {
  startOffset: number;
  endOffset: number;
  quotedText: string;
}

/**
 * Get line number at a given position in text
 */
export function getLineNumberAtPosition(
  text: string,
  position: number
): number {
  const lines = text.substring(0, position).split("\n");
  return lines.length;
}

/**
 * Get the full line of text at a given position
 */
export function getLineAtPosition(text: string, position: number): string {
  const lines = text.split("\n");
  const lineNumber = getLineNumberAtPosition(text, position);
  return lines[lineNumber - 1] || "";
}

/**
 * Normalize quotes for comparison (apostrophes, smart quotes, etc)
 */
function normalizeQuotes(text: string): string {
  return text.replace(/[""]/g, '"').replace(/[''ʼ]/g, "'").replace(/'/g, "'");
}

/**
 * Check if two strings match after normalization
 * This is used instead of normalizing entire documents to preserve offsets
 */
function matchesWithNormalization(text1: string, text2: string): boolean {
  if (text1.length !== text2.length) return false;
  return normalizeQuotes(text1) === normalizeQuotes(text2);
}

/**
 * Find text in document - simple and fast
 */
export function findTextLocation(
  searchText: string,
  documentText: string,
  options: SimpleLocationOptions = {}
): TextLocation | null {
  // Safety checks
  if (!searchText || !documentText) {
    return null;
  }

  let foundOffset = -1;
  let matchedText = searchText;
  let strategy = "exact";
  let confidence = 1.0;

  // Try exact match first
  foundOffset = documentText.indexOf(searchText);

  // Try with quote normalization if enabled
  if (foundOffset === -1 && options.normalizeQuotes) {
    // First, check if the search text even contains normalizable quotes
    const normalizedSearch = normalizeQuotes(searchText);
    if (normalizedSearch !== searchText) {
      // Only do the expensive search if normalization actually changes something
      // Search through the document looking for normalized matches
      // This preserves correct offsets by working with the original text
      for (let i = 0; i <= documentText.length - searchText.length; i++) {
        const candidate = documentText.substring(i, i + searchText.length);
        
        if (matchesWithNormalization(candidate, searchText)) {
          foundOffset = i;
          matchedText = candidate; // Use the actual text from the document
          strategy = "quotes-normalized";
          confidence = 0.95;
          break;
        }
      }
    }
  }

  // Try partial match if enabled
  if (foundOffset === -1 && options.partialMatch && searchText.length > 50) {
    // Try beginning of search text
    const partialLength = Math.min(50, Math.floor(searchText.length * 0.7));
    const partialSearch = searchText.substring(0, partialLength);
    foundOffset = documentText.indexOf(partialSearch);

    if (foundOffset !== -1) {
      // Look for a reasonable end point
      const endSearchStart = foundOffset + partialLength;
      const remainingSearch = searchText.substring(partialLength);

      // Try to find where the text naturally ends
      let endOffset = endSearchStart + remainingSearch.length;

      // Adjust to sentence/paragraph boundary if possible
      const punctuation = [".", "!", "?", "\n"];
      for (const punct of punctuation) {
        const punctIndex = documentText.indexOf(punct, endSearchStart);
        if (punctIndex !== -1 && punctIndex < endOffset + 20) {
          endOffset = punctIndex + 1;
          break;
        }
      }

      matchedText = documentText.substring(foundOffset, endOffset);
      strategy = "partial";
      confidence = 0.7;
    }
  }

  // If still not found, return null
  if (foundOffset === -1) {
    return null;
  }

  const endOffset = foundOffset + matchedText.length;

  return {
    startOffset: foundOffset,
    endOffset: endOffset,
    quotedText: matchedText,
    lineNumber: getLineNumberAtPosition(documentText, foundOffset),
    lineText: getLineAtPosition(documentText, foundOffset),
    strategy,
    confidence,
  };
}