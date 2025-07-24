/**
 * Convenience wrappers for plugin-specific location finding
 * These maintain compatibility with existing plugin interfaces
 */

import { findTextLocation, findMultipleTextLocations, TextLocation, TextLocationOptions } from './textLocationFinder';

// Forecast plugin wrapper
export interface ForecastLocation {
  startOffset: number;
  endOffset: number;
  quotedText: string;
}

export function findForecastLocation(
  searchText: string,
  documentText: string,
  options: {
    allowPartialMatch?: boolean;
    normalizeQuotes?: boolean;
  } = {}
): ForecastLocation | null {
  const forecastOptions: TextLocationOptions = {
    allowPartialMatch: options.allowPartialMatch,
    normalizeQuotes: options.normalizeQuotes,
    allowFuzzy: true, // Forecast plugin benefits from fuzzy matching
    expandToBoundaries: 'sentence',
    keyPhraseExtractors: [
      // Forecast-specific key phrase extractors
      (text: string) => {
        const phrases: string[] = [];
        
        // Look for prediction keywords with context
        const predictionPatterns = [
          /\b(will|shall|predict|forecast|expect|by 20\d{2})\b.{0,30}/gi,
          /\d+%.*?\b(chance|probability|likely|percent)/gi,
          /\b(within|before|after|by)\s+\d+\s+(years?|months?|days?)/gi
        ];
        
        for (const pattern of predictionPatterns) {
          const matches = text.match(pattern);
          if (matches) {
            phrases.push(...matches);
          }
        }
        
        return phrases;
      }
    ]
  };
  
  const result = findTextLocation(searchText, documentText, forecastOptions);
  
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

export function findFactLocation(
  claimText: string,
  documentText: string,
  options: {
    allowFuzzy?: boolean;
    context?: string;
  } = {}
): FactLocation | null {
  const factOptions: TextLocationOptions = {
    allowFuzzy: options.allowFuzzy,
    context: options.context,
    normalizeWhitespace: true, // Facts often have whitespace variations
    caseInsensitive: false, // Facts should be case-sensitive
    expandToBoundaries: 'sentence',
    keyPhraseExtractors: [
      // Fact-specific key phrase extractors
      (text: string) => {
        const phrases: string[] = [];
        
        // Look for quoted text (often factual claims)
        const quotedMatches = text.match(/"([^"]+)"/g);
        if (quotedMatches) {
          phrases.push(...quotedMatches.map(q => q.slice(1, -1)));
        }
        
        // Look for numbers with context
        const numberMatches = text.match(/(\d+(?:\.\d+)?(?:%|billion|million|thousand|,\d{3})*)\s+\w+/g);
        if (numberMatches) {
          phrases.push(...numberMatches);
        }
        
        // Look for dates
        const dateMatches = text.match(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b/gi);
        if (dateMatches) {
          phrases.push(...dateMatches);
        }
        
        // Look for proper nouns (potential entities)
        const properNounMatches = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g);
        if (properNounMatches) {
          // Filter out common words and keep potential entities
          const filtered = properNounMatches.filter(match => 
            match.length > 4 && !['The', 'This', 'That', 'There', 'These', 'Those'].includes(match)
          );
          phrases.push(...filtered);
        }
        
        return phrases;
      }
    ]
  };
  
  const result = findTextLocation(claimText, documentText, factOptions);
  
  if (result) {
    return {
      startOffset: result.startOffset,
      endOffset: result.endOffset,
      quotedText: result.quotedText,
      lineNumber: result.lineNumber,
      lineText: result.lineText
    };
  }
  
  return null;
}

export async function findMultipleFactLocations(
  claims: Array<{ text: string; context?: string }>,
  documentText: string,
  options: { allowFuzzy?: boolean } = {}
): Promise<Map<string, FactLocation | null>> {
  const results = await findMultipleTextLocations(claims, documentText, {
    allowFuzzy: options.allowFuzzy,
    normalizeWhitespace: true,
    expandToBoundaries: 'sentence'
  });
  
  // Convert to FactLocation format
  const factResults = new Map<string, FactLocation | null>();
  
  for (const [text, location] of results) {
    if (location) {
      factResults.set(text, {
        startOffset: location.startOffset,
        endOffset: location.endOffset,
        quotedText: location.quotedText,
        lineNumber: location.lineNumber,
        lineText: location.lineText
      });
    } else {
      factResults.set(text, null);
    }
  }
  
  return factResults;
}

// Spelling plugin wrapper
export interface SpellingLocation {
  startOffset: number;
  endOffset: number;
  quotedText: string;
}

export function findSpellingErrorLocation(
  errorText: string,
  chunkText: string,
  options: {
    allowPartialMatch?: boolean;
    context?: string;
  } = {}
): SpellingLocation | null {
  const spellingOptions: TextLocationOptions = {
    allowPartialMatch: options.allowPartialMatch,
    context: options.context,
    caseInsensitive: true, // Spelling errors might have case differences
    normalizeWhitespace: false, // Preserve original spacing for spelling
    expandToBoundaries: 'none' // Don't expand spelling errors
  };
  
  const result = findTextLocation(errorText, chunkText, spellingOptions);
  
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

export function findHighlightLocation(
  searchText: string,
  documentText: string,
  options: {
    lineNumber?: number;
    contextBefore?: string;
    contextAfter?: string;
  } = {}
): HighlightLocation | null {
  let searchOptions: TextLocationOptions = {
    caseInsensitive: false,
    normalizeWhitespace: true,
    expandToBoundaries: 'none'
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
      
      searchOptions.context = contextParts.join(' ');
    }
  }
  
  const result = findTextLocation(searchText, documentText, searchOptions);
  
  if (result) {
    // Calculate line-based information
    const lines = documentText.split('\n');
    const startLineIndex = result.lineNumber - 1;
    
    // Find end line
    const endOffset = result.endOffset;
    let endLineIndex = startLineIndex;
    let currentOffset = 0;
    
    for (let i = 0; i < lines.length; i++) {
      currentOffset += lines[i].length + 1; // +1 for newline
      if (currentOffset >= endOffset) {
        endLineIndex = i;
        break;
      }
    }
    
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

// Generic wrapper that returns the full TextLocation with all metadata
export function findTextLocationWithMetadata(
  searchText: string,
  documentText: string,
  options: TextLocationOptions = {}
): TextLocation | null {
  return findTextLocation(searchText, documentText, options);
}