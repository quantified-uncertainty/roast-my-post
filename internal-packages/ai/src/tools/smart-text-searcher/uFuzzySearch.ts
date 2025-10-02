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
  
  // Debug logging (commented out for now as logger.isDebugEnabled is not available)
  // if (logger.isDebugEnabled && logger.isDebugEnabled()) {
  //   logger.debug(`uFuzzy ranges: ${JSON.stringify(info.ranges[0])}`);
  //   const ranges = info.ranges[0];
  //   for (let i = 0; i < ranges.length; i += 2) {
  //     logger.debug(`  Range ${i/2}: [${ranges[i]}, ${ranges[i+1]}] = "${documentText.slice(ranges[i], ranges[i+1])}"`);
  //   }
  // }
  
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
  // We want to find the smallest span that contains the most tokens
  
  // Convert ranges to token objects for easier manipulation
  const tokens: Array<{start: number, end: number, text: string}> = [];
  for (let i = 0; i < ranges.length; i += 2) {
    tokens.push({
      start: ranges[i],
      end: ranges[i + 1],
      text: documentText.slice(ranges[i], ranges[i + 1])
    });
  }
  
  // Sort tokens by position
  tokens.sort((a, b) => a.start - b.start);
  
  // Find the best span using a sliding window approach
  // We want the span with the most tokens and smallest total length
  let bestSpan = null;
  let bestScore = -1;
  const searchWords = searchText.split(/\s+/).filter(w => w.length > 0);
  
  // Try different window sizes, preferring larger windows (more complete matches)
  for (let windowSize = tokens.length; windowSize >= Math.min(2, Math.ceil(searchWords.length * 0.4)); windowSize--) {
    for (let i = 0; i <= tokens.length - windowSize; i++) {
      const windowTokens = tokens.slice(i, i + windowSize);
      const spanStart = windowTokens[0].start;
      const spanEnd = windowTokens[windowTokens.length - 1].end;
      const spanText = documentText.slice(spanStart, spanEnd);
      
      // Calculate gaps between consecutive tokens to detect non-contiguous matches
      let maxGap = 0;
      let totalGaps = 0;
      for (let j = 1; j < windowTokens.length; j++) {
        const gap = windowTokens[j].start - windowTokens[j-1].end;
        maxGap = Math.max(maxGap, gap);
        totalGaps += gap;
      }
      
      // Average gap between tokens
      const avgGap = windowTokens.length > 1 ? totalGaps / (windowTokens.length - 1) : 0;
      
      // Heavily penalize large gaps (non-contiguous matches)
      // A gap of > 20 chars likely means tokens are from different phrases
      const gapPenalty = Math.exp(-maxGap / 10); // Exponential decay for large gaps
      
      // Calculate score based on:
      // 1. Number of tokens in span (more is better)
      // 2. Gap penalty (smaller gaps are much better)
      // 3. Word coverage (how many search words appear in span)
      const tokenCount = windowTokens.length;
      const spanLength = spanEnd - spanStart;
      
      // Check word coverage
      let wordCoverage = 0;
      const spanLower = spanText.toLowerCase();
      for (const word of searchWords) {
        if (spanLower.includes(word.toLowerCase())) {
          wordCoverage++;
        }
      }
      const coverageRatio = wordCoverage / searchWords.length;
      
      // Combined score: heavily weight gap penalty to prefer contiguous matches
      const score = (tokenCount / searchWords.length) * 0.2 +  // Token completeness
                    gapPenalty * 0.5 +                          // Contiguity (most important)
                    coverageRatio * 0.3;                        // Word coverage
      
      if (score > bestScore) {
        bestScore = score;
        bestSpan = { start: spanStart, end: spanEnd, text: spanText, tokenCount };
      }
    }
  }
  
  if (!bestSpan) {
    // Fallback: just use all tokens
    const start = tokens[0].start;
    const end = tokens[tokens.length - 1].end;
    bestSpan = {
      start,
      end,
      text: documentText.slice(start, end),
      tokenCount: tokens.length
    };
  }
  
  // Validate boundaries
  if (bestSpan.start < 0 || bestSpan.end > documentText.length || bestSpan.start >= bestSpan.end) {
    return null;
  }
  
  // Calculate confidence based on match quality
  const confidence = calculateConfidence(searchText, bestSpan.text);
  
  return {
    startOffset: bestSpan.start,
    endOffset: bestSpan.end,
    quotedText: bestSpan.text,
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