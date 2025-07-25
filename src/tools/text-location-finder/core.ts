/**
 * Core text location finding logic with fallback strategies
 */

import { logger } from "@/lib/logger";
import { TextLocation, SimpleLocationOptions, EnhancedLocationOptions } from './types';
import { exactSearch } from './exactSearch';
import { uFuzzySearch, UFuzzyOptions } from './uFuzzySearch';
import { llmSearch, LLMSearchOptions } from './llmSearch';

// Re-export types for backward compatibility
export * from './types';

/**
 * Partial match implementation
 * Tries to find the longest common substring between search and document
 */
function partialMatch(
  searchText: string,
  documentText: string,
  minMatchLength: number = 10
): TextLocation | null {
  const searchWords = searchText.split(/\s+/).filter(w => w.length > 0);
  if (searchWords.length === 0) return null;
  
  // Try to find sequences of words from the search text
  for (let wordCount = searchWords.length; wordCount > 0; wordCount--) {
    for (let startIdx = 0; startIdx <= searchWords.length - wordCount; startIdx++) {
      const partialPhrase = searchWords.slice(startIdx, startIdx + wordCount).join(' ');
      
      // Skip if too short
      if (partialPhrase.length < minMatchLength) continue;
      
      const index = documentText.indexOf(partialPhrase);
      if (index !== -1) {
        return {
          startOffset: index,
          endOffset: index + partialPhrase.length,
          quotedText: partialPhrase,
          strategy: 'partial',
          confidence: 0.7 * (partialPhrase.length / searchText.length), // Scale confidence by match percentage
        };
      }
      
      // Try case-insensitive
      const lowerIndex = documentText.toLowerCase().indexOf(partialPhrase.toLowerCase());
      if (lowerIndex !== -1) {
        const matchedText = documentText.slice(lowerIndex, lowerIndex + partialPhrase.length);
        return {
          startOffset: lowerIndex,
          endOffset: lowerIndex + partialPhrase.length,
          quotedText: matchedText,
          strategy: 'partial',
          confidence: 0.65 * (partialPhrase.length / searchText.length),
        };
      }
    }
  }
  
  return null;
}

/**
 * Normalize quotes and special characters
 */
function normalizeQuotes(text: string): string {
  return text
    .replace(/[''`]/g, "'")
    .replace(/[""]/g, '"')
    .replace(/…/g, '...')
    .replace(/—/g, '--')
    .replace(/–/g, '-');
}

/**
 * Find text in document with fallback strategies
 * 1. Exact match (fastest)
 * 2. Quote-normalized exact match (if enabled)
 * 3. Partial match (if enabled)
 * 4. uFuzzy (handles typos and variations)
 * 5. LLM (handles paraphrasing and complex cases)
 */
export async function findTextLocation(
  searchText: string,
  documentText: string,
  options: SimpleLocationOptions = {}
): Promise<TextLocation | null> {
  if (!searchText || !documentText) {
    return null;
  }

  // Strategy 1: Try exact match first
  const exactResult = exactSearch(searchText, documentText);
  if (exactResult) {
    logger.debug('Found with exact search');
    return exactResult;
  }

  // Strategy 2: Try quote-normalized exact match if enabled
  if (options.normalizeQuotes) {
    const normalizedSearch = normalizeQuotes(searchText);
    const normalizedDoc = normalizeQuotes(documentText);
    const normalizedExactResult = exactSearch(normalizedSearch, normalizedDoc);
    
    if (normalizedExactResult) {
      // Map back to original document positions by finding the actual text
      const originalMatch = documentText.slice(normalizedExactResult.startOffset, normalizedExactResult.endOffset);
      logger.debug('Found with quote-normalized exact search');
      return {
        startOffset: normalizedExactResult.startOffset,
        endOffset: normalizedExactResult.endOffset,
        quotedText: originalMatch,
        strategy: 'quotes-normalized',
        confidence: 1.0,
      };
    }
  }

  // Strategy 3: Try partial match if enabled
  if (options.partialMatch) {
    const partialResult = partialMatch(searchText, documentText);
    if (partialResult) {
      logger.debug('Found with partial match');
      return partialResult;
    }
  }

  // Strategy 4: Try uFuzzy for fuzzy matching
  const fuzzyOptions: UFuzzyOptions = {
    normalizeQuotes: options.normalizeQuotes,
    caseSensitive: options.caseSensitive ?? true,  // Default to case-sensitive
  };
  const fuzzyResult = uFuzzySearch(searchText, documentText, fuzzyOptions);
  if (fuzzyResult) {
    logger.debug('Found with uFuzzy search');
    return fuzzyResult;
  }

  // Strategy 5: No LLM fallback in simple version
  logger.debug('Text not found with any strategy');
  return null;
}

/**
 * Find text in document with enhanced options including LLM fallback
 */
export async function findTextLocationEnhanced(
  searchText: string,
  documentText: string,
  options: EnhancedLocationOptions = {}
): Promise<TextLocation | null> {
  if (!searchText || !documentText) {
    return null;
  }

  // Strategy 1: Try exact match first
  const exactResult = exactSearch(searchText, documentText);
  if (exactResult) {
    logger.debug('Found with exact search');
    return exactResult;
  }

  // Strategy 2: Try partial match if enabled
  if (options.partialMatch) {
    const partialResult = partialMatch(searchText, documentText);
    if (partialResult) {
      logger.debug('Found with partial match');
      return partialResult;
    }
  }

  // Strategy 3: Try uFuzzy with enhanced options
  const fuzzyOptions: UFuzzyOptions = {
    normalizeQuotes: options.normalizeQuotes,
    caseSensitive: options.caseSensitive ?? false,
    maxErrors: options.maxDistance,
  };
  const fuzzyResult = uFuzzySearch(searchText, documentText, fuzzyOptions);
  if (fuzzyResult) {
    logger.debug('Found with uFuzzy search');
    return fuzzyResult;
  }

  // Strategy 4: Try LLM if enabled
  if (options.useLLMFallback) {
    const llmOptions: LLMSearchOptions = {
      context: options.context,
      pluginName: options.pluginName
    };
    
    const llmResult = await llmSearch(searchText, documentText, llmOptions);
    if (llmResult) {
      logger.debug('Found with LLM search');
      return llmResult;
    }
  }

  return null;
}