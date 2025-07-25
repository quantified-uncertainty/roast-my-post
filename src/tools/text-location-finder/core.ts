/**
 * Core text location finding logic with uFuzzy
 * Self-contained implementation that doesn't depend on documentAnalysis
 */

import uFuzzy from '@leeoniya/ufuzzy';
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
 * Find text in document with uFuzzy
 */
export function findTextLocation(
  searchText: string,
  documentText: string,
  options: SimpleLocationOptions = {}
): TextLocation | null {
  if (!searchText || !documentText) {
    return null;
  }

  // Strategy 1: Try exact match first (fastest)
  let foundOffset = documentText.indexOf(searchText);
  
  if (foundOffset !== -1) {
    return {
      startOffset: foundOffset,
      endOffset: foundOffset + searchText.length,
      quotedText: searchText,
      lineNumber: getLineNumberAtPosition(documentText, foundOffset),
      lineText: getLineAtPosition(documentText, foundOffset),
      strategy: "exact",
      confidence: 1.0,
    };
  }

  // Strategy 2: Use uFuzzy for fuzzy matching
  logger.debug(`Text search: exact match failed, trying uFuzzy`, {
    searchText: searchText.slice(0, 50)
  });

  // Create a single uFuzzy instance with appropriate settings
  const uf = new uFuzzy({
    intraMode: 1,       // Allow single errors
    interLft: 2,        // Allow extra chars between words
    interRgt: 2,
    intraSub: 1,        // Allow substitutions
    intraTrn: 1,        // Transpositions
    intraDel: 1,        // Deletions
    intraIns: 1,        // Insertions
  });

  // Search in the original document
  const haystack = [documentText];
  const idxs = uf.filter(haystack, searchText);
  
  if (!idxs || idxs.length === 0) {
    return null;
  }

  // Get match details
  const info = uf.info(idxs, haystack, searchText);
  
  if (!info.ranges?.[0] || info.ranges[0].length < 2) {
    return null;
  }

  // For multi-word searches, uFuzzy returns multiple ranges
  // We need to get the full span from the first start to the last end
  const ranges = info.ranges[0];
  const startOffset = ranges[0];
  const endOffset = ranges[ranges.length - 1];
  const matchedText = documentText.slice(startOffset, endOffset);
  
  // Calculate confidence based on match quality
  let confidence = 0.85;
  if (matchedText.length === searchText.length) {
    confidence = 0.9;
  }
  if (matchedText.toLowerCase() === searchText.toLowerCase()) {
    confidence = 0.95;
  }

  return {
    startOffset,
    endOffset,
    quotedText: matchedText,
    lineNumber: getLineNumberAtPosition(documentText, startOffset),
    lineText: getLineAtPosition(documentText, startOffset),
    strategy: "ufuzzy",
    confidence,
  };
}

/**
 * Find text in document with enhanced options (delegates to findTextLocation)
 */
export function findTextLocationEnhanced(
  searchText: string,
  documentText: string,
  options: EnhancedLocationOptions = {}
): TextLocation | null {
  // For now, just delegate to the simple version
  // The enhanced options like maxDistance and caseSensitive are handled by uFuzzy
  return findTextLocation(searchText, documentText, options);
}