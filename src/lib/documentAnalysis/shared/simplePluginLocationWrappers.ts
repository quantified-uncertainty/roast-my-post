/**
 * Simplified plugin location wrappers - 80% less complex
 */

import { findTextLocation, SimpleLocationOptions } from './simpleTextLocationFinder';

// Common location interface for all plugins
export interface PluginLocation {
  startOffset: number;
  endOffset: number;
  quotedText: string;
}

/**
 * Find location for spelling errors
 * Uses: normalizeQuotes (for apostrophes), partialMatch, context
 */
export function findSpellingErrorLocation(
  errorText: string,
  chunkText: string,
  context?: string
): PluginLocation | null {
  const result = findTextLocation(errorText, chunkText, {
    normalizeQuotes: true,  // Handle apostrophe variations
    partialMatch: true,     // For longer errors
    context                 // Use context if provided
  });
  
  if (result) {
    return {
      startOffset: result.startOffset,
      endOffset: result.endOffset,
      quotedText: result.quotedText
    };
  }
  
  return null;
}

/**
 * Find location for forecasts
 * Uses: normalizeQuotes, partialMatch
 */
export function findForecastLocation(
  forecastText: string,
  documentText: string
): PluginLocation | null {
  const result = findTextLocation(forecastText, documentText, {
    normalizeQuotes: true,  // Handle quote variations
    partialMatch: true      // Forecasts can be long
  });
  
  if (result) {
    return {
      startOffset: result.startOffset,
      endOffset: result.endOffset,
      quotedText: result.quotedText
    };
  }
  
  return null;
}

/**
 * Find location for facts
 * Just uses defaults (exact match first, then case-insensitive)
 */
export function findFactLocation(
  claimText: string,
  documentText: string
): PluginLocation | null {
  const result = findTextLocation(claimText, documentText);
  
  if (result) {
    return {
      startOffset: result.startOffset,
      endOffset: result.endOffset,
      quotedText: result.quotedText
    };
  }
  
  return null;
}