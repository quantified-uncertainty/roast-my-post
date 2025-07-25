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
 * Find text in document with fallback strategies
 * 1. Exact match (fastest)
 * 2. uFuzzy (handles typos and variations)
 * 3. LLM (handles paraphrasing and complex cases)
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

  // Strategy 2: Try uFuzzy for fuzzy matching
  const fuzzyOptions: UFuzzyOptions = {
    normalizeQuotes: options.normalizeQuotes
  };
  const fuzzyResult = uFuzzySearch(searchText, documentText, fuzzyOptions);
  if (fuzzyResult) {
    logger.debug('Found with uFuzzy search');
    return fuzzyResult;
  }

  // Strategy 3: No LLM fallback in simple version
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

  // Try basic strategies first
  const basicResult = await findTextLocation(searchText, documentText, options);
  if (basicResult) {
    return basicResult;
  }

  // Strategy 3: Try LLM if enabled
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