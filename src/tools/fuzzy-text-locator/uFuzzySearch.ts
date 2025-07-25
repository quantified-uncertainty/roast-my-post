/**
 * Enhanced uFuzzy-based fuzzy text search
 * Better handles multi-word queries and special cases
 */

import uFuzzy from '@leeoniya/ufuzzy';
import { logger } from "@/lib/logger";
import { TextLocation } from './types';

export interface UFuzzyOptions {
  normalizeQuotes?: boolean;
  caseSensitive?: boolean;
  maxErrors?: number;
  expandBoundaries?: boolean; // New option for better boundary detection
}

// Normalize quotes and apostrophes to standard ASCII
function normalizeQuotes(text: string): string {
  return text
    .replace(/[''`]/g, "'")
    .replace(/[""]/g, '"')
    .replace(/…/g, '...')
    .replace(/—/g, '--')
    .replace(/–/g, '-');
}

export function uFuzzySearch(
  searchText: string,
  documentText: string,
  options: UFuzzyOptions = {}
): TextLocation | null {
  logger.debug(`uFuzzy search for: "${searchText.slice(0, 50)}..."`);
  
  // Try exact match first (case-sensitive)
  const exactIndex = documentText.indexOf(searchText);
  if (exactIndex !== -1) {
    return {
      startOffset: exactIndex,
      endOffset: exactIndex + searchText.length,
      quotedText: searchText,
      strategy: "exact",
      confidence: 1.0,
    };
  }
  // Try exact case-insensitive match
  const lowerSearch = searchText.toLowerCase();
  const lowerDoc = documentText.toLowerCase();
  const exactLowerIndex = lowerDoc.indexOf(lowerSearch);
  
  if (exactLowerIndex !== -1) {
    return {
      startOffset: exactLowerIndex,
      endOffset: exactLowerIndex + searchText.length,
      quotedText: documentText.slice(exactLowerIndex, exactLowerIndex + searchText.length),
      strategy: "ufuzzy",
      confidence: 0.95,
    };
  }
  
  // Try with whitespace normalization (handle line breaks as spaces)
  const normalizedSearch = searchText.replace(/\s+/g, ' ').trim();
  const normalizedDoc = documentText.replace(/\s+/g, ' ');
  const normalizedIndex = normalizedDoc.toLowerCase().indexOf(normalizedSearch.toLowerCase());
  
  if (normalizedIndex !== -1) {
    // Find the actual boundaries in the original document
    const actualBounds = findActualBoundaries(normalizedSearch, normalizedIndex, documentText, normalizedDoc);
    if (actualBounds) {
      return {
        startOffset: actualBounds.startOffset,
        endOffset: actualBounds.endOffset,
        quotedText: actualBounds.quotedText,
        strategy: "ufuzzy",
        confidence: 0.9,
      };
    }
  }
  
  // For very short queries, use a different approach
  if (searchText.length <= 3) {
    return handleShortQuery(searchText, documentText);
  }
  
  // For punctuation-only queries
  if (/^[^\w\s]+$/.test(searchText)) {
    return handlePunctuationQuery(searchText, documentText);
  }
  
  // Handle special characters and normalization only if requested
  const { processedSearch, processedDoc, reverseMap } = preprocessText(
    searchText, 
    documentText, 
    options
  );
  // Configure uFuzzy based on query characteristics
  const ufConfig = getUFuzzyConfig(searchText, options);
  const uf = new uFuzzy(ufConfig);
  
  // Create haystack array
  const haystack = [processedDoc];
  // Try uFuzzy search
  const idxs = uf.filter(haystack, processedSearch);
  
  if (!idxs || idxs.length === 0) {
    // Fallback to sliding window approach for difficult cases
    return slidingWindowFuzzySearch(searchText, documentText, options);
  }
  
  // Get match info
  const info = uf.info(idxs, haystack, processedSearch);
  
  if (!info.ranges?.[0]) {
    return null;
  }
  
  // Process ranges to find actual match boundaries
  const location = processUFuzzyRanges(
    info.ranges[0],
    processedSearch,
    processedDoc,
    documentText,
    reverseMap
  );
  
  if (location) {
    logger.debug(`uFuzzy found: "${location.quotedText}" at [${location.startOffset}, ${location.endOffset}]`);
  }
  
  return location;
}

/**
 * Handle very short queries (1-3 chars)
 */
function handleShortQuery(
  searchText: string,
  documentText: string
): TextLocation | null {
  // For single character, find first occurrence
  if (searchText.length === 1) {
    const index = documentText.indexOf(searchText);
    if (index !== -1) {
      return {
        startOffset: index,
        endOffset: index + 1,
        quotedText: searchText,
        strategy: "exact-short",
        confidence: 1.0,
      };
    }
  }
  
  // For 2-3 chars, try exact then case-insensitive
  const exactIdx = documentText.indexOf(searchText);
  if (exactIdx !== -1) {
    return {
      startOffset: exactIdx,
      endOffset: exactIdx + searchText.length,
      quotedText: searchText,
      strategy: "exact-short",
      confidence: 1.0,
    };
  }
  
  // Case-insensitive fallback
  const lowerIdx = documentText.toLowerCase().indexOf(searchText.toLowerCase());
  if (lowerIdx !== -1) {
    return {
      startOffset: lowerIdx,
      endOffset: lowerIdx + searchText.length,
      quotedText: documentText.slice(lowerIdx, lowerIdx + searchText.length),
      strategy: "case-insensitive-short",
      confidence: 0.9,
    };
  }
  
  return null;
}

/**
 * Handle punctuation-only queries
 */
function handlePunctuationQuery(
  searchText: string,
  documentText: string
): TextLocation | null {
  const index = documentText.indexOf(searchText);
  if (index !== -1) {
    return {
      startOffset: index,
      endOffset: index + searchText.length,
      quotedText: searchText,
      strategy: "punctuation-exact",
      confidence: 1.0,
    };
  }
  return null;
}

/**
 * Preprocess text for better fuzzy matching
 */
function preprocessText(
  searchText: string,
  documentText: string,
  options: UFuzzyOptions
): {
  processedSearch: string;
  processedDoc: string;
  reverseMap?: Map<number, number>;
} {
  if (!options.normalizeQuotes) {
    return {
      processedSearch: searchText,
      processedDoc: documentText,
    };
  }
  
  // Normalize various quote types and special characters
  const normalizeChar = (char: string): string => {
    switch (char) {
      case '\u2018': case '\u2019': case '`': return "'"; // Left/right single quotes
      case '\u201C': case '\u201D': return '"'; // Left/right double quotes
      case '\u2026': return '...'; // Ellipsis
      case '\u2014': return '--'; // Em dash
      case '\u2013': return '-'; // En dash
      case '\u00A0': return ' '; // Non-breaking space
      default: return char;
    }
  };
  
  // Build normalized strings and position map
  let processedSearch = '';
  let processedDoc = '';
  const reverseMap = new Map<number, number>();
  
  for (let i = 0; i < searchText.length; i++) {
    processedSearch += normalizeChar(searchText[i]);
  }
  
  for (let i = 0; i < documentText.length; i++) {
    const normalized = normalizeChar(documentText[i]);
    reverseMap.set(processedDoc.length, i);
    processedDoc += normalized;
  }
  
  return { processedSearch, processedDoc, reverseMap };
}

/**
 * Get uFuzzy configuration based on query characteristics
 */
function getUFuzzyConfig(searchText: string, options: UFuzzyOptions): any {
  const baseConfig = {
    intraMode: 1,
    interLft: 2,
    interRgt: 2,
    intraSub: 1,
    intraTrn: 1,
    intraDel: 1,
    intraIns: 1,
  };
  
  // Adjust for query length
  if (searchText.length > 50) {
    baseConfig.intraMode = 2;
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
 * Find actual boundaries when whitespace normalization was used
 */
function findActualBoundaries(
  normalizedSearch: string,
  normalizedIndex: number,
  originalDoc: string,
  normalizedDoc: string
): { startOffset: number; endOffset: number; quotedText: string } | null {
  // Map normalized position back to original position
  let originalPos = 0;
  let normalizedPos = 0;
  
  // Find start position
  while (normalizedPos < normalizedIndex && originalPos < originalDoc.length) {
    if (originalDoc[originalPos].match(/\s/)) {
      // Skip whitespace in original, but count as single space in normalized
      while (originalPos < originalDoc.length && originalDoc[originalPos].match(/\s/)) {
        originalPos++;
      }
      normalizedPos++;
    } else {
      originalPos++;
      normalizedPos++;
    }
  }
  
  const startOffset = originalPos;
  
  // Find end position by advancing through the search text length
  let remainingChars = normalizedSearch.length;
  while (remainingChars > 0 && originalPos < originalDoc.length) {
    if (originalDoc[originalPos].match(/\s/)) {
      // Skip all whitespace in original
      while (originalPos < originalDoc.length && originalDoc[originalPos].match(/\s/)) {
        originalPos++;
      }
      remainingChars--; // Count as one space
    } else {
      originalPos++;
      remainingChars--;
    }
  }
  
  const endOffset = originalPos;
  
  if (startOffset >= endOffset || endOffset > originalDoc.length) {
    return null;
  }
  
  return {
    startOffset,
    endOffset,
    quotedText: originalDoc.slice(startOffset, endOffset)
  };
}

/**
 * Process uFuzzy ranges to find actual match boundaries
 */
function processUFuzzyRanges(
  ranges: number[],
  searchText: string,
  processedDoc: string,
  originalDoc: string,
  reverseMap?: Map<number, number>
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
  
  // Map back to original document if we normalized
  let startOffset = minStart;
  let endOffset = maxEnd;
  
  if (reverseMap) {
    // Map the start position
    startOffset = reverseMap.get(minStart) ?? minStart;
    
    // For end position, we need to find the original character position
    // that corresponds to the end of the match in the processed text
    let mappedEnd = startOffset;
    
    // More careful mapping of the end position
    for (let processedPos = minStart; processedPos < maxEnd && processedPos < processedDoc.length; processedPos++) {
      const originalPos = reverseMap.get(processedPos);
      if (originalPos !== undefined && originalPos >= mappedEnd) {
        mappedEnd = originalPos;
      }
    }
    
    // Find the actual end by looking for the last mapped position
    let actualEnd = mappedEnd;
    for (let processedPos = maxEnd - 1; processedPos >= minStart; processedPos--) {
      const originalPos = reverseMap.get(processedPos);
      if (originalPos !== undefined) {
        actualEnd = originalPos + 1; // +1 for exclusive end
        break;
      }
    }
    
    endOffset = Math.min(actualEnd, originalDoc.length);
  } else {
    // When no reverse mapping, ensure we don't extend beyond document bounds
    endOffset = Math.min(maxEnd, originalDoc.length);
  }
  
  // Validate boundaries
  if (startOffset < 0 || endOffset > originalDoc.length || startOffset >= endOffset) {
    return null;
  }
  
  const quotedText = originalDoc.slice(startOffset, endOffset);
  
  // Only expand word boundaries if the match seems incomplete
  let finalBounds = { startOffset, endOffset, quotedText };
  
  // Check if we should expand boundaries
  if (quotedText.length < searchText.length * 0.9) {
    finalBounds = expandToWordBoundaries(startOffset, endOffset, originalDoc, searchText);
  }
  
  // Calculate confidence
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
  
  const searchWords = searchText.toLowerCase().split(/\s+/);
  
  // Check if we're in the middle of words that should be included
  let expandedStart = startOffset;
  let expandedEnd = endOffset;
  
  // Only expand if we're clearly cutting off words
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
  
  // Only use expanded boundaries if they're reasonable and improve the match
  const expandedText = document.slice(expandedStart, expandedEnd);
  
  // Don't expand too much
  if (expandedText.length > searchText.length * 2) {
    return {
      startOffset,
      endOffset,
      quotedText: originalText
    };
  }
  
  // Check if expansion actually helps
  const expandedWords = expandedText.toLowerCase().split(/\s+/);
  const originalWords = originalText.toLowerCase().split(/\s+/);
  
  const originalMatchCount = searchWords.filter(word => 
    originalWords.some(ow => ow.includes(word) || word.includes(ow))
  ).length;
  
  const expandedMatchCount = searchWords.filter(word => 
    expandedWords.some(ew => ew.includes(word) || word.includes(ew))
  ).length;
  
  if (expandedMatchCount > originalMatchCount) {
    return {
      startOffset: expandedStart,
      endOffset: expandedEnd,
      quotedText: expandedText
    };
  }
  
  return {
    startOffset,
    endOffset,
    quotedText: originalText
  };
}

/**
 * Sliding window fuzzy search as fallback
 */
function slidingWindowFuzzySearch(
  searchText: string,
  documentText: string,
  options: UFuzzyOptions = {}
): TextLocation | null {
  const searchLen = searchText.length;
  const windowSize = Math.floor(searchLen * 1.5); // Allow 50% extra chars
  
  let bestMatch: TextLocation | null = null;
  let bestScore = 0;
  
  for (let i = 0; i <= documentText.length - searchLen + 10; i++) {
    const window = documentText.slice(i, i + windowSize);
    const score = fuzzyScore(searchText.toLowerCase(), window.toLowerCase());
    
    if (score > bestScore && score > 0.8) {
      // Find the best boundaries within the window
      const boundaries = findBestBoundaries(searchText, window, i, documentText);
      if (boundaries) {
        bestScore = score;
        bestMatch = boundaries;
      }
    }
  }
  
  return bestMatch;
}

/**
 * Calculate fuzzy match score
 */
function fuzzyScore(needle: string, haystack: string): number {
  if (haystack.includes(needle)) return 1.0;
  
  // Simple character-based scoring
  let matches = 0;
  let needleIdx = 0;
  
  for (let i = 0; i < haystack.length && needleIdx < needle.length; i++) {
    if (haystack[i] === needle[needleIdx]) {
      matches++;
      needleIdx++;
    }
  }
  
  return matches / needle.length;
}

/**
 * Find best match boundaries within a window
 */
function findBestBoundaries(
  searchText: string,
  window: string,
  windowStart: number,
  fullDocument: string
): TextLocation | null {
  // Try to find word boundaries
  const searchWords = searchText.split(/\s+/);
  const windowWords = window.split(/\s+/);
  
  // Simple heuristic: find span that includes all search words
  let start = window.length;
  let end = 0;
  
  for (const searchWord of searchWords) {
    const wordIdx = window.toLowerCase().indexOf(searchWord.toLowerCase());
    if (wordIdx !== -1) {
      start = Math.min(start, wordIdx);
      end = Math.max(end, wordIdx + searchWord.length);
    }
  }
  
  if (start < window.length && end > 0) {
    const absoluteStart = windowStart + start;
    const absoluteEnd = windowStart + end;
    
    return {
      startOffset: absoluteStart,
      endOffset: absoluteEnd,
      quotedText: fullDocument.slice(absoluteStart, absoluteEnd),
      strategy: "sliding-window",
      confidence: 0.7,
    };
  }
  
  return null;
}

/**
 * Calculate confidence score for a match
 */
function calculateConfidence(searchText: string, matchedText: string): number {
  const searchLower = searchText.toLowerCase();
  const matchLower = matchedText.toLowerCase();
  
  if (searchText === matchedText) return 1.0;
  if (searchLower === matchLower) return 0.95;
  
  // Calculate edit distance ratio
  const maxLen = Math.max(searchText.length, matchedText.length);
  const editDistance = levenshteinDistance(searchLower, matchLower);
  const similarity = 1 - (editDistance / maxLen);
  
  // Be more restrictive - don't give high confidence to poor matches
  if (similarity < 0.7) return Math.max(0.6, similarity);
  
  return Math.max(0.7, Math.min(0.95, similarity));
}

/**
 * Simple Levenshtein distance implementation
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  
  return matrix[b.length][a.length];
}