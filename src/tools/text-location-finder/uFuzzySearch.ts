/**
 * uFuzzy-based fuzzy text search
 * Handles typos, transpositions, missing/extra characters
 */

import uFuzzy from '@leeoniya/ufuzzy';
import { logger } from "@/lib/logger";
import { TextLocation } from './types';

export interface UFuzzyOptions {
  normalizeQuotes?: boolean;
  maxErrors?: number;  // For future: could adjust intraMode based on this
}

export function uFuzzySearch(
  searchText: string,
  documentText: string,
  options: UFuzzyOptions = {}
): TextLocation | null {
  logger.debug(`uFuzzy search for: "${searchText.slice(0, 50)}..."`);
  
  // Configure uFuzzy for fuzzy matching
  const uf = new uFuzzy({
    intraMode: 1,       // Allow single errors per term
    interLft: 2,        // Allow extra chars between words
    interRgt: 2,
    intraSub: 1,        // Allow character substitutions
    intraTrn: 1,        // Allow character transpositions
    intraDel: 1,        // Allow character deletions
    intraIns: 1,        // Allow character insertions
  });
  
  // Search in the original document
  const haystack = [documentText];
  const idxs = uf.filter(haystack, searchText);
  
  if (!idxs || idxs.length === 0) {
    logger.debug('uFuzzy: No matches found');
    return null;
  }
  
  // Get match details
  const info = uf.info(idxs, haystack, searchText);
  
  if (!info.ranges?.[0] || info.ranges[0].length < 2) {
    logger.debug('uFuzzy: No valid ranges returned');
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
  
  logger.debug(`uFuzzy found: "${matchedText}" at [${startOffset}, ${endOffset}] with confidence ${confidence}`);
  
  return {
    startOffset,
    endOffset,
    quotedText: matchedText,
    strategy: "ufuzzy",
    confidence,
  };
}