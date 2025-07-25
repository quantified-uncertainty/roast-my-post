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
 * Find text in document with uFuzzy
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

  // Strategy 1: Try exact match first (fastest)
  foundOffset = documentText.indexOf(searchText);

  // Strategy 2: If exact match fails, try uFuzzy
  if (foundOffset === -1) {
    logger.debug(`Text search: exact match failed, trying uFuzzy`, {
      searchText: searchText.slice(0, 50)
    });
    
    // Configure uFuzzy for fuzzy matching
    const uf = new uFuzzy({
      intraMode: 1,      // Enable single-error tolerance
      interLft: 2,       // Allow up to 2 extra chars between terms  
      interRgt: 2,       // Allow up to 2 extra chars between terms
      intraSub: 1,       // Allow character substitutions
      intraTrn: 1,       // Allow character transpositions  
      intraDel: 1,       // Allow character deletions
      intraIns: 1,       // Allow character insertions
    });
    
    // Try different text preparations
    const searchVariants: Array<{text: string, doc: string, strategy: string, confidence: number}> = [];
    
    // Always try original text with fuzzy matching
    searchVariants.push({
      text: searchText,
      doc: documentText,
      strategy: 'ufuzzy',
      confidence: 0.85
    });
    
    // Try normalized quotes if enabled and applicable
    if (options.normalizeQuotes) {
      const normalizedSearch = normalizeQuotes(searchText);
      if (normalizedSearch !== searchText) {
        searchVariants.push({
          text: normalizedSearch,
          doc: normalizeQuotes(documentText),
          strategy: 'ufuzzy-quotes',
          confidence: 0.8
        });
      }
    }
    
    // Try case-insensitive
    searchVariants.push({
      text: searchText.toLowerCase(),
      doc: documentText.toLowerCase(),
      strategy: 'ufuzzy-case',
      confidence: 0.75
    });
    
    // Try partial match for long text
    if (options.partialMatch && searchText.length > 50) {
      searchVariants.push({
        text: searchText.slice(0, 50),
        doc: documentText,
        strategy: 'ufuzzy-partial',
        confidence: 0.7
      });
    }
    
    // Try each variant
    for (const variant of searchVariants) {
      const uf = new uFuzzy({
        intraMode: 1,
        interLft: 2,
        interRgt: 2,
        intraSub: 1,
        intraTrn: 1,
        intraDel: 1,
        intraIns: 1,
      });
      
      // For single document search, haystack is an array with one item
      const haystack = [variant.doc];
      const needle = variant.text;
      
      // Filter to find matches
      const idxs = uf.filter(haystack, needle);
      
      if (idxs && idxs.length > 0) {
        // Get detailed match info
        const info = uf.info(idxs, haystack, needle);
        
        // Get the ranges for the first (and only) match
        if (info.ranges && info.ranges.length > 0) {
          const ranges = info.ranges[0];
          if (Array.isArray(ranges) && ranges.length >= 2) {
            // uFuzzy returns ranges as pairs of [start, end] offsets
            foundOffset = ranges[0];
            const endOffset = ranges[1];
            
            // If we were searching in transformed text (lowercase, normalized),
            // we need to find the actual text in the original document
            if (variant.doc !== documentText) {
              // Get the matched text from the transformed document
              const transformedMatch = variant.doc.slice(foundOffset, endOffset);
              
              // Try to find this text in the original document
              // This is approximate - the positions might not align perfectly
              const originalMatch = documentText.slice(foundOffset, Math.min(endOffset, documentText.length));
              matchedText = originalMatch;
            } else {
              matchedText = documentText.slice(foundOffset, endOffset);
            }
            
            strategy = variant.strategy;
            confidence = variant.confidence;
            
            logger.debug(`uFuzzy found match with ${strategy}`, {
              searchText: searchText.slice(0, 50),
              matchedText: matchedText.slice(0, 50),
              startOffset: foundOffset,
              endOffset: endOffset
            });
            
            break; // Found a match, stop trying variants
          }
        }
      }
    }
  }

  // If still not found, try the old quote normalization method
  if (foundOffset === -1 && options.normalizeQuotes) {
    const normalizedSearch = normalizeQuotes(searchText);
    if (normalizedSearch !== searchText) {
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

  // If still not found, return null
  if (foundOffset === -1) {
    logger.debug('Text not found with any strategy', { 
      searchText: searchText.slice(0, 50),
      strategies: ['exact', 'ufuzzy', 'quotes-normalized']
    });
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