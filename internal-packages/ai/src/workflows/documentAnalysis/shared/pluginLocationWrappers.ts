/**
 * Convenience wrappers for plugin-specific location finding
 * These maintain compatibility with existing plugin interfaces
 */

import { findTextLocation, type TextLocationOptions } from '@roast/ai/tools/fuzzy-text-locator/core';
import { getLineNumberAtPosition, getLineAtPosition } from '@roast/ai/analysis-plugins/utils/textHelpers';
import { processLocationsInParallel } from './parallelLocationUtils';

// Forecast plugin wrapper
export interface ForecastLocation {
  startOffset: number;
  endOffset: number;
  quotedText: string;
}

export async function findForecastLocation(
  searchText: string,
  documentText: string,
  options: {
    allowPartialMatch?: boolean;
    normalizeQuotes?: boolean;
  } = {}
): Promise<ForecastLocation | null> {
  const forecastOptions: TextLocationOptions = {
    partialMatch: options.allowPartialMatch,
    normalizeQuotes: options.normalizeQuotes,
    maxTypos: 2, // Allow fuzzy matching for forecast
    pluginName: 'forecast'
  };
  
  const result = await findTextLocation(searchText, documentText, forecastOptions);
  
  if (result) {
    return {
      startOffset: result.startOffset,
      endOffset: result.endOffset,
      quotedText: result.quotedText
    };
  }
  
  return null;
}

// Fact-check plugin wrapper
export interface FactLocation {
  startOffset: number;
  endOffset: number;
  quotedText: string;
  lineNumber: number;
  lineText: string;
}

export async function findFactLocation(
  claimText: string,
  documentText: string,
  options: {
    allowFuzzy?: boolean;
    context?: string;
  } = {}
): Promise<FactLocation | null> {
  const factOptions: TextLocationOptions = {
    maxTypos: options.allowFuzzy ? 2 : 0,
    llmContext: options.context,
    caseSensitive: true, // Facts should be case-sensitive
    pluginName: 'fact-check'
  };
  
  const result = await findTextLocation(claimText, documentText, factOptions);
  
  if (result) {
    const lineNumber = getLineNumberAtPosition(documentText, result.startOffset);
    const lineText = getLineAtPosition(documentText, result.startOffset);
    
    return {
      startOffset: result.startOffset,
      endOffset: result.endOffset,
      quotedText: result.quotedText,
      lineNumber,
      lineText
    };
  }
  
  return null;
}

export async function findMultipleFactLocations(
  claims: Array<{ text: string; context?: string }>,
  documentText: string,
  options: { allowFuzzy?: boolean } = {}
): Promise<Map<string, FactLocation | null>> {
  return processLocationsInParallel(
    claims,
    (claim) => claim.text,
    (claim) => findFactLocation(claim.text, documentText, {
      allowFuzzy: options.allowFuzzy,
      context: claim.context
    })
  );
}

// Spelling plugin wrapper
export interface SpellingLocation {
  startOffset: number;
  endOffset: number;
  quotedText: string;
}

export async function findSpellingErrorLocation(
  errorText: string,
  chunkText: string,
  options: {
    allowPartialMatch?: boolean;
    context?: string;
  } = {}
): Promise<SpellingLocation | null> {
  const spellingOptions: TextLocationOptions = {
    partialMatch: options.allowPartialMatch,
    llmContext: options.context,
    caseSensitive: false, // Spelling errors might have case differences
    normalizeQuotes: true, // Handle apostrophe variations
    pluginName: 'spelling'
  };
  
  const result = await findTextLocation(errorText, chunkText, spellingOptions);
  
  if (result) {
    return {
      startOffset: result.startOffset,
      endOffset: result.endOffset,
      quotedText: result.quotedText
    };
  }
  
  return null;
}

// Highlight extraction wrapper for line-based highlights
export interface HighlightLocation {
  startOffset: number;
  endOffset: number;
  quotedText: string;
  startLineIndex: number;
  endLineIndex: number;
  startCharacters: string;
  endCharacters: string;
}

export async function findHighlightLocation(
  searchText: string,
  documentText: string,
  options: {
    lineNumber?: number;
    contextBefore?: string;
    contextAfter?: string;
  } = {}
): Promise<HighlightLocation | null> {
  let searchOptions: TextLocationOptions = {
    caseSensitive: false,
    normalizeQuotes: true,
    maxTypos: 3,           // Allow up to 3 character differences
    partialMatch: true,    // Allow partial matches for long text
    pluginName: 'highlight'
  };
  
  // If we have line information, construct context
  if (options.lineNumber && (options.contextBefore || options.contextAfter)) {
    const lines = documentText.split('\n');
    const lineIndex = options.lineNumber - 1;
    
    if (lineIndex >= 0 && lineIndex < lines.length) {
      const contextParts = [];
      if (options.contextBefore) contextParts.push(options.contextBefore);
      contextParts.push(lines[lineIndex]);
      if (options.contextAfter) contextParts.push(options.contextAfter);
      
      searchOptions.llmContext = contextParts.join(' ');
    }
  }
  
  const result = await findTextLocation(searchText, documentText, searchOptions);
  
  if (result) {
    // Calculate line-based information using existing utilities
    const lines = documentText.split('\n');
    const startLineNumber = getLineNumberAtPosition(documentText, result.startOffset);
    const endLineNumber = getLineNumberAtPosition(documentText, result.endOffset);
    const startLineIndex = startLineNumber - 1;
    const endLineIndex = endLineNumber - 1;
    
    // Extract start and end characters
    const startLine = lines[startLineIndex] || '';
    const endLine = lines[endLineIndex] || '';
    
    const startCharacters = startLine.slice(0, 10).trim() || '...';
    const endCharacters = endLine.length > 10 
      ? endLine.slice(-10).trim()
      : endLine.trim() || '...';
    
    return {
      startOffset: result.startOffset,
      endOffset: result.endOffset,
      quotedText: result.quotedText,
      startLineIndex,
      endLineIndex,
      startCharacters,
      endCharacters
    };
  }
  
  return null;
}