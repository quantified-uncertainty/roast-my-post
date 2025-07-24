/**
 * Unified text location finder for document analysis
 * Combines strategies from forecast, fact-check, and spelling plugins
 */

import { getLineNumberAtPosition, getLineAtPosition } from "../../analysis-plugins/utils/textHelpers";
import { logger } from "@/lib/logger";

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
}

interface LocationStrategy {
  name: string;
  confidence: number; // Base confidence for this strategy
  find(searchText: string, documentText: string, options: TextLocationOptions): TextLocation | null;
}

/**
 * Strategy for exact text matching
 */
class ExactMatchStrategy implements LocationStrategy {
  name = 'exact';
  confidence = 1.0;
  
  find(searchText: string, documentText: string, options: TextLocationOptions): TextLocation | null {
    const startOffset = documentText.indexOf(searchText);
    if (startOffset !== -1) {
      return createTextLocation(startOffset, searchText, documentText, this.name, this.confidence);
    }
    return null;
  }
}

/**
 * Strategy for case-insensitive matching
 */
class CaseInsensitiveStrategy implements LocationStrategy {
  name = 'caseInsensitive';
  confidence = 0.9;
  
  find(searchText: string, documentText: string, options: TextLocationOptions): TextLocation | null {
    if (!options.caseInsensitive) return null;
    
    // Safety check for undefined searchText
    if (!searchText || typeof searchText !== 'string') {
      logger.error('CaseInsensitiveStrategy: searchText is undefined or not a string', { searchText });
      return null;
    }
    
    const searchLower = searchText.toLowerCase();
    const docLower = documentText.toLowerCase();
    const startOffset = docLower.indexOf(searchLower);
    
    if (startOffset !== -1) {
      const originalText = documentText.substring(startOffset, startOffset + searchText.length);
      return createTextLocation(startOffset, originalText, documentText, this.name, this.confidence);
    }
    return null;
  }
}

/**
 * Strategy for normalized quote matching
 */
class NormalizedQuoteStrategy implements LocationStrategy {
  name = 'normalizedQuotes';
  confidence = 0.95;
  
  find(searchText: string, documentText: string, options: TextLocationOptions): TextLocation | null {
    if (!options.normalizeQuotes) return null;
    
    const normalizedSearch = normalizeQuotes(searchText);
    const normalizedDoc = normalizeQuotes(documentText);
    
    const startOffset = normalizedDoc.indexOf(normalizedSearch);
    if (startOffset !== -1) {
      const originalText = documentText.slice(startOffset, startOffset + searchText.length);
      return createTextLocation(startOffset, originalText, documentText, this.name, this.confidence);
    }
    return null;
  }
}

/**
 * Strategy for normalized whitespace matching
 */
class NormalizedWhitespaceStrategy implements LocationStrategy {
  name = 'normalizedWhitespace';
  confidence = 0.85;
  
  find(searchText: string, documentText: string, options: TextLocationOptions): TextLocation | null {
    if (!options.normalizeWhitespace) return null;
    
    const normalizedSearch = normalizeWhitespace(searchText);
    const normalizedDoc = normalizeWhitespace(documentText);
    const startOffset = normalizedDoc.indexOf(normalizedSearch);
    
    if (startOffset !== -1) {
      const endOffset = findOriginalEndOffset(documentText, startOffset, normalizedSearch.length);
      const originalText = documentText.substring(startOffset, endOffset);
      return createTextLocation(startOffset, originalText, documentText, this.name, this.confidence);
    }
    return null;
  }
}

/**
 * Strategy for context-based matching
 */
class ContextMatchStrategy implements LocationStrategy {
  name = 'context';
  confidence = 0.8;
  
  find(searchText: string, documentText: string, options: TextLocationOptions): TextLocation | null {
    if (!options.context) return null;
    
    // Try to find the context in the document
    const contextStartOffset = documentText.indexOf(options.context);
    if (contextStartOffset !== -1) {
      // Look for the search text within the context
      const searchInContext = options.context.indexOf(searchText);
      if (searchInContext !== -1) {
        const absoluteStart = contextStartOffset + searchInContext;
        return createTextLocation(absoluteStart, searchText, documentText, this.name, this.confidence);
      }
    }
    
    // Fallback: use surrounding words approach from spelling plugin
    return findUsingContextWords(searchText, documentText, options.context, this.name, this.confidence);
  }
}

/**
 * Strategy for partial matching (for long text)
 */
class PartialMatchStrategy implements LocationStrategy {
  name = 'partialMatch';
  confidence = 0.7;
  
  find(searchText: string, documentText: string, options: TextLocationOptions): TextLocation | null {
    if (!options.allowPartialMatch) return null;
    
    const minLength = options.minPartialMatchLength || 50;
    if (searchText.length <= minLength) return null;
    
    // Try to match first portion of text
    let partialLength = minLength;
    let startOffset = -1;
    
    // Try progressively shorter lengths if the initial one doesn't match
    while (partialLength >= 20 && startOffset === -1) {
      const partialSearch = searchText.slice(0, partialLength);
      startOffset = documentText.indexOf(partialSearch);
      
      if (startOffset === -1) {
        // Try with normalized whitespace
        const normalizedSearch = partialSearch.replace(/\s+/g, ' ').trim();
        const normalizedDoc = documentText.replace(/\s+/g, ' ');
        const normalizedOffset = normalizedDoc.indexOf(normalizedSearch);
        
        if (normalizedOffset !== -1) {
          // Map back to original position (approximate)
          startOffset = normalizedOffset; // Simplified mapping
          logger.debug(`PartialMatchStrategy: Found with normalized whitespace at length ${partialLength}`);
        }
      }
      
      if (startOffset === -1) {
        partialLength -= 10;
      }
    }
    
    if (startOffset !== -1) {
      const matchedText = searchText.slice(0, partialLength);
      
      // If expansion is requested, expand to boundaries
      if (options.expandToBoundaries && options.expandToBoundaries !== 'none') {
        const expanded = expandToNaturalBoundary(documentText, startOffset, matchedText.length, options);
        if (expanded) {
          return createTextLocation(expanded.start, expanded.text, documentText, this.name, this.confidence);
        }
      }
      // Otherwise, just return the partial match
      return createTextLocation(startOffset, matchedText, documentText, this.name, this.confidence);
    }
    return null;
  }
}

/**
 * Strategy for fuzzy matching using key phrases
 */
class KeyPhraseStrategy implements LocationStrategy {
  name = 'keyPhrase';
  confidence = 0.6;
  
  find(searchText: string, documentText: string, options: TextLocationOptions): TextLocation | null {
    if (!options.allowFuzzy) return null;
    
    const keyPhrases = extractKeyPhrases(searchText, options);
    const minLength = options.minKeyPhraseLength || 10;
    
    for (const phrase of keyPhrases) {
      // Allow shorter phrases for years and numbers
      const isYearOrNumber = /\b20\d{2}\b|\d+%/.test(phrase);
      const effectiveMinLength = isYearOrNumber ? 3 : minLength;
      
      if (phrase.length < effectiveMinLength) continue;
      
      const startOffset = documentText.indexOf(phrase);
      if (startOffset !== -1) {
        // Expand to find the full relevant text
        const expanded = expandToNaturalBoundary(documentText, startOffset, phrase.length, options);
        if (expanded) {
          return createTextLocation(expanded.start, expanded.text, documentText, this.name, this.confidence);
        }
      }
    }
    return null;
  }
}

// Location finding strategies in order of preference
const defaultStrategies: LocationStrategy[] = [
  new ExactMatchStrategy(),
  new NormalizedQuoteStrategy(),
  new CaseInsensitiveStrategy(),
  new NormalizedWhitespaceStrategy(),
  new ContextMatchStrategy(),
  new PartialMatchStrategy(),
  new KeyPhraseStrategy()
];

/**
 * Find the location of text in a document using multiple strategies
 */
export function findTextLocation(
  searchText: string,
  documentText: string,
  options: TextLocationOptions = {}
): TextLocation | null {
  // Safety check for undefined inputs
  if (!searchText || typeof searchText !== 'string') {
    logger.error('findTextLocation: searchText is undefined or not a string', { searchText });
    return null;
  }
  
  if (!documentText || typeof documentText !== 'string') {
    logger.error('findTextLocation: documentText is undefined or not a string');
    return null;
  }
  
  // Set default options
  const opts: TextLocationOptions = {
    allowFuzzy: false,
    allowPartialMatch: false,
    caseInsensitive: false,
    normalizeQuotes: false,
    normalizeWhitespace: false,
    expandToBoundaries: 'none',
    minPartialMatchLength: 50,
    minKeyPhraseLength: 10,
    ...options
  };
  
  // Log search details for debugging
  logger.debug('findTextLocation: Starting search', {
    searchTextLength: searchText.length,
    searchTextPreview: searchText.slice(0, 50) + (searchText.length > 50 ? '...' : ''),
    documentLength: documentText.length,
    enabledStrategies: {
      fuzzy: opts.allowFuzzy,
      partial: opts.allowPartialMatch,
      caseInsensitive: opts.caseInsensitive,
      normalizeQuotes: opts.normalizeQuotes,
      normalizeWhitespace: opts.normalizeWhitespace,
      hasContext: !!opts.context
    }
  });
  
  // Try each strategy in order
  for (const strategy of defaultStrategies) {
    const location = strategy.find(searchText, documentText, opts);
    if (location) {
      logger.debug('findTextLocation: Found match', {
        strategy: strategy.name,
        confidence: location.confidence,
        matchedText: location.quotedText.slice(0, 50) + (location.quotedText.length > 50 ? '...' : '')
      });
      return location;
    }
  }
  
  logger.warn('findTextLocation: No match found', {
    searchTextPreview: searchText.slice(0, 100) + (searchText.length > 100 ? '...' : ''),
    triedStrategies: defaultStrategies.map(s => s.name)
  });
  
  return null;
}

/**
 * Find locations for multiple texts in parallel
 */
export async function findMultipleTextLocations(
  searches: Array<{ text: string; context?: string }>,
  documentText: string,
  options: TextLocationOptions = {}
): Promise<Map<string, TextLocation | null>> {
  const results = new Map<string, TextLocation | null>();

  // Process all searches in parallel
  const locationPromises = searches.map(async (search) => {
    // Run in next tick to ensure true parallelism
    await new Promise(resolve => setImmediate(resolve));
    
    const location = findTextLocation(search.text, documentText, {
      ...options,
      context: search.context
    });
    
    return { searchText: search.text, location };
  });

  // Wait for all locations to be found
  const locations = await Promise.all(locationPromises);
  
  // Build the results map
  for (const { searchText, location } of locations) {
    results.set(searchText, location);
  }

  return results;
}

/**
 * Create a TextLocation object from offset and text
 */
function createTextLocation(
  startOffset: number,
  text: string,
  documentText: string,
  strategy: string,
  confidence: number
): TextLocation {
  const endOffset = startOffset + text.length;
  const lineNumber = getLineNumberAtPosition(documentText, startOffset);
  const lineText = getLineAtPosition(documentText, startOffset);

  return {
    startOffset,
    endOffset,
    quotedText: text,
    lineNumber,
    lineText,
    strategy,
    confidence
  };
}

/**
 * Normalize different quote styles
 */
function normalizeQuotes(text: string): string {
  return text
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'");
}

/**
 * Normalize whitespace
 */
function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * Find the original end offset when working with normalized text
 */
function findOriginalEndOffset(
  originalText: string,
  startOffset: number,
  normalizedLength: number
): number {
  let charCount = 0;
  let i = startOffset;
  
  while (i < originalText.length && charCount < normalizedLength) {
    if (!/\s/.test(originalText[i])) {
      charCount++;
    }
    i++;
  }
  
  // Include trailing whitespace if any
  while (i < originalText.length && /\s/.test(originalText[i])) {
    i++;
  }
  
  return i;
}

/**
 * Find text using context words approach (from spelling plugin)
 */
function findUsingContextWords(
  searchText: string,
  documentText: string,
  context: string,
  strategy: string,
  confidence: number
): TextLocation | null {
  const contextLower = context.toLowerCase();
  const searchLower = searchText.toLowerCase();
  const searchIndex = contextLower.indexOf(searchLower);
  
  if (searchIndex === -1) return null;
  
  // Get words before and after the search text
  const beforeStart = Math.max(0, searchIndex - 20);
  const beforeText = context.substring(beforeStart, searchIndex).trim();
  const beforeWords = beforeText.split(/\s+/).slice(-2).join(' ');
  
  const afterEnd = Math.min(context.length, searchIndex + searchText.length + 20);
  const afterText = context.substring(searchIndex + searchText.length, afterEnd).trim();
  const afterWords = afterText.split(/\s+/).slice(0, 2).join(' ');
  
  // Try to find this pattern in the document
  if (beforeWords) {
    const patternWithBefore = beforeWords + ' ' + searchText;
    const patternIndex = documentText.indexOf(patternWithBefore);
    if (patternIndex !== -1) {
      const searchStart = patternIndex + beforeWords.length + 1;
      return createTextLocation(searchStart, searchText, documentText, strategy, confidence);
    }
  }
  
  if (afterWords) {
    const patternWithAfter = searchText + ' ' + afterWords;
    const patternIndex = documentText.indexOf(patternWithAfter);
    if (patternIndex !== -1) {
      return createTextLocation(patternIndex, searchText, documentText, strategy, confidence);
    }
  }
  
  return null;
}

/**
 * Extract key phrases from text for fuzzy matching
 */
function extractKeyPhrases(text: string, options: TextLocationOptions): string[] {
  const phrases: string[] = [];
  
  // Use custom extractors if provided
  if (options.keyPhraseExtractors) {
    for (const extractor of options.keyPhraseExtractors) {
      phrases.push(...extractor(text));
    }
  }
  
  // Default extractors (from forecast plugin)
  
  // Look for year patterns
  const yearMatch = text.match(/\b20\d{2}\b/);
  if (yearMatch) {
    // Add the year itself
    phrases.push(yearMatch[0]);
    
    // Add phrase around the year (shorter, more likely to match)
    const yearIndex = text.indexOf(yearMatch[0]);
    const start = Math.max(0, yearIndex - 10);
    const end = Math.min(text.length, yearIndex + yearMatch[0].length + 10);
    phrases.push(text.slice(start, end).trim());
  }
  
  // Look for percentage patterns
  const percentMatch = text.match(/\d+%/);
  if (percentMatch) {
    const percentIndex = text.indexOf(percentMatch[0]);
    const start = Math.max(0, percentIndex - 20);
    const end = Math.min(text.length, percentIndex + percentMatch[0].length + 20);
    phrases.push(text.slice(start, end).trim());
  }
  
  // Look for numbers with context (from fact-check plugin)
  const numberMatch = text.match(/(\d+(?:\.\d+)?(?:%|billion|million|thousand)?)\s+\w+/);
  if (numberMatch) {
    phrases.push(numberMatch[0]);
  }
  
  // Look for quoted text
  const quotedMatch = text.match(/"([^"]+)"/);
  if (quotedMatch) {
    phrases.push(quotedMatch[1]);
  }
  
  // Look for "will" statements (forecast-specific)
  if (text.includes(" will ")) {
    const willIndex = text.indexOf(" will ");
    const start = Math.max(0, willIndex - 10);
    const end = Math.min(text.length, willIndex + 40);
    phrases.push(text.slice(start, end).trim());
  }
  
  // Extract middle portion of long text
  const words = text.split(/\s+/);
  if (words.length > 6) {
    const start = Math.floor(words.length / 4);
    const end = start + Math.floor(words.length / 2);
    phrases.push(words.slice(start, end).join(' '));
  }
  
  return phrases;
}

/**
 * Expand a match to natural boundaries
 */
function expandToNaturalBoundary(
  text: string,
  startOffset: number,
  initialLength: number,
  options: TextLocationOptions
): { start: number; text: string } | null {
  if (options.expandToBoundaries === 'none') {
    return {
      start: startOffset,
      text: text.slice(startOffset, startOffset + initialLength)
    };
  }
  
  // Find sentence boundaries
  if (options.expandToBoundaries === 'sentence') {
    return expandToSentence(text, startOffset, initialLength);
  }
  
  // Find paragraph boundaries  
  if (options.expandToBoundaries === 'paragraph') {
    return expandToParagraph(text, startOffset, initialLength);
  }
  
  return null;
}

/**
 * Expand a match to sentence boundaries
 */
function expandToSentence(
  text: string,
  startOffset: number,
  initialLength: number
): { start: number; text: string } | null {
  // Find sentence start
  let sentenceStart = startOffset;
  
  // Look backwards for sentence start
  for (let i = startOffset - 1; i >= Math.max(0, startOffset - 200); i--) {
    const char = text[i];
    const nextChar = text[i + 1];
    
    if ((char === '.' || char === '!' || char === '?') && /\s/.test(nextChar)) {
      sentenceStart = i + 1;
      // Skip whitespace
      while (sentenceStart < startOffset && /\s/.test(text[sentenceStart])) {
        sentenceStart++;
      }
      break;
    }
    // Also break at paragraph boundaries
    if (i > 0 && text[i - 1] === '\n' && text[i] === '\n') {
      sentenceStart = i + 1;
      break;
    }
  }
  
  // Find sentence end
  let sentenceEnd = startOffset + initialLength;
  let foundEnd = false;
  
  for (let i = sentenceEnd; i < Math.min(text.length, startOffset + 300); i++) {
    const char = text[i];
    
    if (char === '.' || char === '!' || char === '?') {
      // Check if this is really the end of a sentence
      const nextChar = text[i + 1];
      if (!nextChar || /\s/.test(nextChar)) {
        sentenceEnd = i + 1;
        foundEnd = true;
        break;
      }
    }
    
    // Also break at paragraph boundaries
    if (i < text.length - 1 && text[i] === '\n' && text[i + 1] === '\n') {
      sentenceEnd = i;
      foundEnd = true;
      break;
    }
  }
  
  return {
    start: sentenceStart,
    text: text.slice(sentenceStart, sentenceEnd).trim()
  };
}

/**
 * Expand a match to paragraph boundaries
 */
function expandToParagraph(
  text: string,
  startOffset: number,
  initialLength: number
): { start: number; text: string } | null {
  // Find paragraph start (double newline or start of text)
  let paragraphStart = 0;
  for (let i = startOffset - 1; i >= 0; i--) {
    if (text.slice(i, i + 2) === '\n\n') {
      paragraphStart = i + 2;
      break;
    }
  }
  
  // Find paragraph end (double newline or end of text)
  let paragraphEnd = text.length;
  for (let i = startOffset + initialLength; i < text.length - 1; i++) {
    if (text.slice(i, i + 2) === '\n\n') {
      paragraphEnd = i;
      break;
    }
  }
  
  return {
    start: paragraphStart,
    text: text.slice(paragraphStart, paragraphEnd).trim()
  };
}