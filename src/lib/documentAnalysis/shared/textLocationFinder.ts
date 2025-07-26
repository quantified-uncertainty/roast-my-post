/**
 * Unified text location finder for document analysis
 * This is now a wrapper around the fuzzy-text-locator tool
 */

import { getLineNumberAtPosition, getLineAtPosition } from "../../analysis-plugins/utils/textHelpers";
import { logger } from "@/lib/logger";
import { findTextLocation as findTextLocationCore, type TextLocationOptions as CoreOptions } from "@/tools/fuzzy-text-locator";
import { processTextLocationsInParallel } from "./parallelLocationUtils";

export interface TextLocation {
  startOffset: number;
  endOffset: number;
  quotedText: string;
  lineNumber: number;
  lineText: string;
  strategy: string;
  confidence: number; // 0-1, higher is better
}

export interface TextLocationOptions {
  // Matching behavior
  allowFuzzy?: boolean;
  allowPartialMatch?: boolean;
  caseInsensitive?: boolean;
  
  // Text normalization
  normalizeQuotes?: boolean;
  normalizeWhitespace?: boolean;
  
  // Context-based searching
  context?: string;
  
  // Boundary expansion
  expandToBoundaries?: 'sentence' | 'paragraph' | 'none';
  
  // Custom key phrase extractors for fuzzy matching
  keyPhraseExtractors?: Array<(text: string) => string[]>;
  
  // Minimum lengths for partial/fuzzy matching
  minPartialMatchLength?: number;
  minKeyPhraseLength?: number;
  
  // Enable LLM fallback for difficult cases
  enableLLMFallback?: boolean;
}

/**
 * Find the location of text in a document using multiple strategies
 * This now delegates to the unified fuzzy-text-locator tool
 */
export async function findTextLocation(
  searchText: string,
  documentText: string,
  options: TextLocationOptions = {}
): Promise<TextLocation | null> {
  // Map options to the core tool's format
  const coreOptions: CoreOptions = {
    caseSensitive: !options.caseInsensitive,
    normalizeQuotes: options.normalizeQuotes,
    partialMatch: options.allowPartialMatch,
    maxTypos: options.allowFuzzy ? 3 : 0,
    useLLMFallback: options.enableLLMFallback ?? false,
    llmContext: options.context,
    pluginName: 'documentAnalysis'
  };
  
  const result = await findTextLocationCore(searchText, documentText, coreOptions);
  
  if (!result) {
    return null;
  }
  
  // Add line information
  const lineNumber = getLineNumberAtPosition(documentText, result.startOffset);
  const lineText = getLineAtPosition(documentText, result.startOffset);
  
  return {
    startOffset: result.startOffset,
    endOffset: result.endOffset,
    quotedText: result.quotedText,
    lineNumber,
    lineText,
    strategy: result.strategy,
    confidence: result.confidence
  };
}

/**
 * Find locations for multiple texts in parallel
 * This is kept for backward compatibility
 */
export async function findMultipleTextLocations(
  searches: Array<{ text: string; context?: string }>,
  documentText: string,
  options: TextLocationOptions = {}
): Promise<Map<string, TextLocation | null>> {
  return processTextLocationsInParallel(
    searches,
    (search) => findTextLocation(search.text, documentText, {
      ...options,
      context: search.context
    })
  );
}