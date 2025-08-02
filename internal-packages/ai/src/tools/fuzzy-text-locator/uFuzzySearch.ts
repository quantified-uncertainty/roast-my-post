/**
 * uFuzzy-based fuzzy text search
 * Focuses solely on fuzzy matching - exact matches handled by exactSearch
 */

import uFuzzy from '@leeoniya/ufuzzy';
import { logger } from "../../shared/logger";
import { TextLocation } from './types';

export interface UFuzzyOptions {
  normalizeQuotes?: boolean;
  caseSensitive?: boolean;
  maxErrors?: number;
}

export function uFuzzySearch(
  searchText: string,
  documentText: string,
  options: UFuzzyOptions = {}
): TextLocation | null {
  logger.debug(`uFuzzy search for: "${searchText.slice(0, 50)}..."`);
  
  // Skip if query is too short for meaningful fuzzy matching
  if (searchText.length < 3) {
    return null;
  }
  
  // Configure uFuzzy based on query characteristics
  const ufConfig = getUFuzzyConfig(searchText, options);
  const uf = new uFuzzy(ufConfig);
  
  // Create haystack array - use document text directly
  const haystack = [documentText];
  
  // Try uFuzzy search
  const idxs = uf.filter(haystack, searchText);
  
  if (!idxs || idxs.length === 0) {
    return null;
  }
  
  // Get match info
  const info = uf.info(idxs, haystack, searchText);
  
  if (!info.ranges?.[0]) {
    return null;
  }
  
  // Process ranges to find actual match boundaries
  const location = processUFuzzyRanges(
    info.ranges[0],
    searchText,
    documentText
  );
  
  if (location) {
    logger.debug(`uFuzzy found: "${location.quotedText}" at [${location.startOffset}, ${location.endOffset}]`);
  }
  
  return location;
}

/**
 * Get uFuzzy configuration based on query characteristics
 */
function getUFuzzyConfig(searchText: string, options: UFuzzyOptions): any {
  const baseConfig = {
    intraMode: 1, // Allow single-char substitution, transposition, insertion, deletion
    interLft: 2,  // Allow gaps between terms
    interRgt: 2,
    intraSub: 1,  // Allow substitutions
    intraTrn: 1,  // Allow transpositions
    intraDel: 1,  // Allow deletions
    intraIns: 1,  // Allow insertions
  };
  
  // Adjust for query length - longer queries can tolerate more errors
  if (searchText.length > 50) {
    baseConfig.intraMode = 2; // More permissive for long queries
    baseConfig.interLft = 3;
    baseConfig.interRgt = 3;
  }
  
  // Apply custom max errors if specified
  if (options.maxErrors !== undefined) {
    baseConfig.intraMode = Math.min(options.maxErrors, 2);
  }
  
  return baseConfig;
}

/**
 * Process uFuzzy ranges to find actual match boundaries
 */
function processUFuzzyRanges(
  ranges: number[],
  searchText: string,
  documentText: string
): TextLocation | null {
  if (ranges.length < 2) return null;
  
  // uFuzzy returns [start1, end1, start2, end2, ...] for each matched token
  // We need to find the span from first start to last end
  
  let minStart = Infinity;
  let maxEnd = -1;
  
  // Process ranges in pairs
  for (let i = 0; i < ranges.length; i += 2) {
    const start = ranges[i];
    const end = ranges[i + 1];
    
    if (start < minStart) minStart = start;
    if (end > maxEnd) maxEnd = end;
  }
  
  if (minStart === Infinity || maxEnd === -1 || minStart >= maxEnd) {
    return null;
  }
  
  // Use the ranges directly - no complex mapping needed
  const startOffset = minStart;
  const endOffset = Math.min(maxEnd, documentText.length);
  
  // Validate boundaries
  if (startOffset < 0 || endOffset > documentText.length || startOffset >= endOffset) {
    return null;
  }
  
  const quotedText = documentText.slice(startOffset, endOffset);
  
  // Only expand word boundaries if the match seems incomplete
  let finalBounds = { startOffset, endOffset, quotedText };
  
  // Check if we should expand boundaries for very short matches
  if (quotedText.length < searchText.length * 0.7) {
    finalBounds = expandToWordBoundaries(startOffset, endOffset, documentText, searchText);
  }
  
  // Calculate confidence based on match quality
  const confidence = calculateConfidence(searchText, finalBounds.quotedText);
  
  return {
    startOffset: finalBounds.startOffset,
    endOffset: finalBounds.endOffset,
    quotedText: finalBounds.quotedText,
    strategy: "ufuzzy",
    confidence,
  };
}

/**
 * Expand match boundaries to include complete words when reasonable
 */
function expandToWordBoundaries(
  startOffset: number,
  endOffset: number,
  document: string,
  searchText: string
): { startOffset: number; endOffset: number; quotedText: string } {
  const originalText = document.slice(startOffset, endOffset);
  
  // Don't expand if the match is already reasonable length
  if (originalText.length >= searchText.length * 0.8) {
    return {
      startOffset,
      endOffset,
      quotedText: originalText
    };
  }
  
  let expandedStart = startOffset;
  let expandedEnd = endOffset;
  
  // Expand start backwards if we're in the middle of a word
  if (startOffset > 0 && /\w/.test(document[startOffset - 1]) && /\w/.test(document[startOffset])) {
    while (expandedStart > 0 && /\w/.test(document[expandedStart - 1])) {
      expandedStart--;
    }
  }
  
  // Expand end forwards if we're in the middle of a word
  if (endOffset < document.length && /\w/.test(document[endOffset - 1]) && /\w/.test(document[endOffset])) {
    while (expandedEnd < document.length && /\w/.test(document[expandedEnd])) {
      expandedEnd++;
    }
  }
  
  const expandedText = document.slice(expandedStart, expandedEnd);
  
  // Don't expand too much
  if (expandedText.length > searchText.length * 2) {
    return {
      startOffset,
      endOffset,
      quotedText: originalText
    };
  }
  
  return {
    startOffset: expandedStart,
    endOffset: expandedEnd,
    quotedText: expandedText
  };
}

/**
 * Calculate confidence score for a match
 */
function calculateConfidence(searchText: string, matchedText: string): number {
  const searchLower = searchText.toLowerCase();
  const matchLower = matchedText.toLowerCase();
  
  if (searchText === matchedText) return 1.0;
  if (searchLower === matchLower) return 0.95;
  
  // Calculate similarity based on length and character overlap
  const maxLen = Math.max(searchText.length, matchedText.length);
  const minLen = Math.min(searchText.length, matchedText.length);
  const lengthSimilarity = minLen / maxLen;
  
  // Simple character overlap check
  let overlap = 0;
  const searchChars = searchLower.split('');
  const matchChars = matchLower.split('');
  
  for (const char of searchChars) {
    const index = matchChars.indexOf(char);
    if (index !== -1) {
      overlap++;
      matchChars.splice(index, 1); // Remove matched character
    }
  }
  
  const charSimilarity = overlap / searchText.length;
  
  // Combine similarities with length bias
  const similarity = (lengthSimilarity * 0.3) + (charSimilarity * 0.7);
  
  // Be more restrictive - don't give high confidence to poor matches
  return Math.max(0.6, Math.min(0.95, similarity));
}