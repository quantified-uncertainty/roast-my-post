/**
 * Core text location finding logic with fallback strategies
 */

import { logger } from "@/lib/logger";
import { TextLocation, TextLocationOptions } from './types';
import { exactSearch } from './exactSearch';
import { uFuzzySearch, UFuzzyOptions } from './uFuzzySearch';
import { markdownAwareFuzzySearch, MarkdownAwareFuzzyOptions } from './markdownAwareFuzzySearch';
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
      
      // Lower the threshold for meaningful short phrases
      let effectiveMinLength = minMatchLength;
      if (partialPhrase.length >= 4) {
        // Accept 4+ character phrases that are likely meaningful
        if (/^\d{4}$/.test(partialPhrase) || // Years like 2025
            partialPhrase.length >= 6) {     // Any 6+ character phrase
          effectiveMinLength = Math.min(effectiveMinLength, partialPhrase.length);
        }
      }
      
      // Skip if too short
      if (partialPhrase.length < effectiveMinLength) continue;
      
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
 * 5. Markdown-aware fuzzy (handles LLM conceptualizing markdown as plain text)
 * 6. LLM (handles paraphrasing and complex cases)
 */
export async function findTextLocation(
  searchText: string,
  documentText: string,
  options: TextLocationOptions = {}
): Promise<TextLocation | null> {
  if (!searchText || !documentText) {
    return null;
  }
  
  // If we have a line number hint, try searching around that area first
  if (options.lineNumberHint && options.lineNumberHint > 0) {
    const lines = documentText.split('\n');
    const targetLine = options.lineNumberHint - 1; // Convert to 0-based index
    
    if (targetLine >= 0 && targetLine < lines.length) {
      // First, try to find on the exact target line
      let lineStartOffset = 0;
      for (let i = 0; i < targetLine; i++) {
        lineStartOffset += lines[i].length + 1; // +1 for newline
      }
      
      const targetLineText = lines[targetLine];
      const exactLineResult = exactSearch(searchText, targetLineText);
      
      if (exactLineResult) {
        logger.debug(`Found with exact search on target line ${options.lineNumberHint}`);
        return {
          ...exactLineResult,
          startOffset: exactLineResult.startOffset + lineStartOffset,
          endOffset: exactLineResult.endOffset + lineStartOffset,
          strategy: 'exact-line-hint'
        };
      }
      
      // If not found on exact line, search in a window around it
      const windowStart = Math.max(0, targetLine - 5);
      const windowEnd = Math.min(lines.length, targetLine + 6);
      
      // Search each line in the window, starting from closest to target
      for (let distance = 0; distance <= 5; distance++) {
        // Check lines at this distance from target
        const linesToCheck = [
          targetLine - distance,
          targetLine + distance
        ].filter(line => line >= windowStart && line < windowEnd && line !== targetLine);
        
        for (const lineIndex of linesToCheck) {
          let lineOffset = 0;
          for (let i = 0; i < lineIndex; i++) {
            lineOffset += lines[i].length + 1;
          }
          
          const lineResult = exactSearch(searchText, lines[lineIndex]);
          if (lineResult) {
            logger.debug(`Found with exact search in line ${lineIndex + 1} (distance ${distance} from hint)`);
            return {
              ...lineResult,
              startOffset: lineResult.startOffset + lineOffset,
              endOffset: lineResult.endOffset + lineOffset,
              strategy: 'exact-line-hint'
            };
          }
        }
      }
    }
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
    caseSensitive: options.caseSensitive ?? false, // Default to case-insensitive for better matching
    maxErrors: options.maxTypos,
  };
  const fuzzyResult = uFuzzySearch(searchText, documentText, fuzzyOptions);
  if (fuzzyResult) {
    logger.debug('Found with uFuzzy search');
    return fuzzyResult;
  }

  // Strategy 5: Try markdown-aware fuzzy search
  const markdownAwareOptions: MarkdownAwareFuzzyOptions = {
    ...fuzzyOptions, // Inherit all fuzzy options
  };
  const markdownResult = markdownAwareFuzzySearch(searchText, documentText, markdownAwareOptions);
  if (markdownResult) {
    logger.debug('Found with markdown-aware fuzzy search');
    return markdownResult;
  }

  // Strategy 6: Try LLM if enabled
  if (options.useLLMFallback) {
    const llmOptions: LLMSearchOptions = {
      context: options.llmContext,
      pluginName: options.pluginName
    };
    
    const llmResult = await llmSearch(searchText, documentText, llmOptions);
    if (llmResult) {
      logger.debug('Found with LLM search');
      return llmResult;
    }
  }

  logger.debug('Text not found with any strategy');
  return null;
}

// Keep the enhanced function as an alias for backward compatibility
export const findTextLocationEnhanced = findTextLocation;