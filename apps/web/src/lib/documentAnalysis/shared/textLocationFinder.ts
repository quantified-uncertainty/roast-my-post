/**
 * Unified text location finder for document analysis
 * This is now a wrapper around the fuzzy-text-locator tool
 */

import { getLineNumberAtPosition, getLineAtPosition } from "@roast/ai/analysis-plugins/utils/textHelpers";
import { logger } from "@/lib/logger";
import { findTextLocation as findTextLocationCore, type TextLocationOptions as CoreOptions } from "@roast/ai/tools/fuzzy-text-locator/core";
import { processTextLocationsInParallel } from "./parallelLocationUtils";

/**
 * Expand text location to sentence or paragraph boundaries
 */
function expandToBoundaries(
  location: { startOffset: number; endOffset: number; quotedText: string; strategy: string; confidence: number },
  documentText: string,
  boundary: 'sentence' | 'paragraph' | 'none'
): { startOffset: number; endOffset: number; quotedText: string; strategy: string; confidence: number } {
  if (boundary === 'none') {
    return location;
  }
  
  let newStartOffset = location.startOffset;
  let newEndOffset = location.endOffset;
  
  if (boundary === 'sentence') {
    // Find sentence boundaries (. ! ?)
    const sentenceStart = documentText.lastIndexOf('.', location.startOffset - 1);
    const exclamStart = documentText.lastIndexOf('!', location.startOffset - 1);
    const questionStart = documentText.lastIndexOf('?', location.startOffset - 1);
    
    const actualStart = Math.max(sentenceStart, exclamStart, questionStart);
    if (actualStart !== -1 && actualStart < location.startOffset) {
      // Move past the punctuation and any whitespace
      let searchStart = actualStart + 1;
      while (searchStart < location.startOffset && /\s/.test(documentText[searchStart])) {
        searchStart++;
      }
      if (searchStart < location.startOffset) {
        newStartOffset = searchStart;
      }
    }
    
    // Find end of sentence
    let sentenceEnd = documentText.indexOf('.', location.endOffset);
    let exclamEnd = documentText.indexOf('!', location.endOffset);
    let questionEnd = documentText.indexOf('?', location.endOffset);
    
    // Take the nearest end
    const possibleEnds = [sentenceEnd, exclamEnd, questionEnd].filter(pos => pos !== -1);
    if (possibleEnds.length > 0) {
      const actualEnd = Math.min(...possibleEnds);
      if (actualEnd > location.endOffset) {
        newEndOffset = actualEnd + 1; // Include the punctuation
      }
    }
  } else if (boundary === 'paragraph') {
    // Find paragraph boundaries (double newlines or start/end of document)
    const paragraphStart = documentText.lastIndexOf('\n\n', location.startOffset - 1);
    if (paragraphStart !== -1) {
      newStartOffset = paragraphStart + 2; // Skip the double newline
    } else {
      newStartOffset = 0; // Start of document
    }
    
    const paragraphEnd = documentText.indexOf('\n\n', location.endOffset);
    if (paragraphEnd !== -1) {
      newEndOffset = paragraphEnd;
    } else {
      newEndOffset = documentText.length; // End of document
    }
  }
  
  return {
    startOffset: newStartOffset,
    endOffset: newEndOffset,
    quotedText: documentText.slice(newStartOffset, newEndOffset),
    strategy: location.strategy,
    confidence: location.confidence
  };
}

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
    caseSensitive: options.caseInsensitive ?? false, // Default to case-insensitive for better matching
    normalizeQuotes: options.normalizeQuotes,
    partialMatch: options.allowPartialMatch,
    maxTypos: options.allowFuzzy ? 3 : undefined, // Enable fuzzy matching if allowFuzzy is true
    useLLMFallback: options.enableLLMFallback ?? false,
    llmContext: options.context,
    pluginName: 'documentAnalysis'
  };
  
  let result = await findTextLocationCore(searchText, documentText, coreOptions);
  
  if (!result) {
    return null;
  }
  
  // Handle boundary expansion if requested
  if (options.expandToBoundaries && result) {
    result = expandToBoundaries(result, documentText, options.expandToBoundaries);
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