/**
 * Simplified text location finder - 80% less complex
 * Based on actual plugin usage patterns
 */

import { getLineNumberAtPosition, getLineAtPosition } from "@roast/ai/analysis-plugins/utils/textHelpers";
import { logger } from "@/infrastructure/logging/logger";

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
  // Just the options plugins actually use
  normalizeQuotes?: boolean;
  partialMatch?: boolean;
  context?: string;
}

/**
 * Normalize quotes for comparison (apostrophes, smart quotes, etc)
 */
function normalizeQuotes(text: string): string {
  return text
    .replace(/[""]/g, '"')
    .replace(/[''ʼ]/g, "'")
    .replace(/'/g, "'");
}

/**
 * Find text in document - simple and fast
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
  let strategy = 'exact';
  let confidence = 1.0;

  // Strategy 1: Exact match
  foundOffset = documentText.indexOf(searchText);
  
  // Strategy 2: Normalized quotes (for spelling errors with apostrophes)
  if (foundOffset === -1 && options.normalizeQuotes) {
    const normalizedSearch = normalizeQuotes(searchText);
    const normalizedDoc = normalizeQuotes(documentText);
    foundOffset = normalizedDoc.indexOf(normalizedSearch);
    if (foundOffset !== -1) {
      strategy = 'quotes';
      confidence = 0.95;
      // Get the actual text at this position
      matchedText = documentText.slice(foundOffset, foundOffset + searchText.length);
    }
  }

  // Strategy 3: Case insensitive (always useful for spelling)
  if (foundOffset === -1) {
    const searchLower = searchText.toLowerCase();
    const docLower = documentText.toLowerCase();
    foundOffset = docLower.indexOf(searchLower);
    if (foundOffset !== -1) {
      strategy = 'case';
      confidence = 0.9;
      matchedText = documentText.slice(foundOffset, foundOffset + searchText.length);
    }
  }

  // Strategy 4: Partial match (for long quotes)
  if (foundOffset === -1 && options.partialMatch && searchText.length > 50) {
    // Try first 50 characters
    const partial = searchText.slice(0, 50);
    foundOffset = documentText.indexOf(partial);
    if (foundOffset !== -1) {
      strategy = 'partial';
      confidence = 0.7;
      matchedText = partial;
    }
  }

  // Strategy 5: Context-based (for spelling errors)
  if (foundOffset === -1 && options.context) {
    const contextLower = options.context.toLowerCase();
    const searchLower = searchText.toLowerCase();
    const searchIndex = contextLower.indexOf(searchLower);
    
    if (searchIndex !== -1) {
      // Get words before the search text
      const beforeText = options.context.substring(Math.max(0, searchIndex - 20), searchIndex).trim();
      const beforeWords = beforeText.split(/\s+/).slice(-2).join(' ');
      
      if (beforeWords) {
        const pattern = beforeWords + ' ' + searchText;
        foundOffset = documentText.indexOf(pattern);
        if (foundOffset !== -1) {
          foundOffset += beforeWords.length + 1;
          strategy = 'context';
          confidence = 0.8;
        }
      }
    }
  }

  // If nothing found, return null
  if (foundOffset === -1) {
    logger.debug('Text not found', { 
      searchText: searchText.slice(0, 50),
      strategy: 'none'
    });
    return null;
  }

  // Create the location result
  const location: TextLocation = {
    startOffset: foundOffset,
    endOffset: foundOffset + matchedText.length,
    quotedText: matchedText,
    lineNumber: getLineNumberAtPosition(documentText, foundOffset),
    lineText: getLineAtPosition(documentText, foundOffset),
    strategy,
    confidence
  };

  logger.debug('Text found', {
    strategy,
    confidence,
    preview: matchedText.slice(0, 50)
  });

  return location;
}

/**
 * Find multiple texts - simple parallel processing
 */
export async function findMultipleTextLocations(
  searches: Array<{ text: string; context?: string }>,
  documentText: string,
  options: SimpleLocationOptions = {}
): Promise<Map<string, TextLocation | null>> {
  const results = new Map<string, TextLocation | null>();

  // Just map over searches - no need for complex parallelism
  for (const search of searches) {
    const location = findTextLocation(search.text, documentText, {
      ...options,
      context: search.context
    });
    results.set(search.text, location);
  }

  return results;
}