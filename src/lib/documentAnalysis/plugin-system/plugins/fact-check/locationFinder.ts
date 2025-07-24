/**
 * Location finder for Fact Check Plugin
 * Finds the exact location of facts in document text
 */

import { getLineNumberAtPosition, getLineAtPosition } from "../../utils/textHelpers";
import { LIMITS } from "./constants";

export interface FactLocation {
  startOffset: number;
  endOffset: number;
  quotedText: string;
  lineNumber: number;
  lineText: string;
}

interface LocationStrategy {
  name: string;
  find(claimText: string, documentText: string, context?: string): FactLocation | null;
}

/**
 * Strategy for exact text matching
 */
class ExactMatchStrategy implements LocationStrategy {
  name = 'exact';
  
  find(claimText: string, documentText: string): FactLocation | null {
    const startOffset = documentText.indexOf(claimText);
    if (startOffset !== -1) {
      return createFactLocation(startOffset, claimText, documentText);
    }
    return null;
  }
}

/**
 * Strategy for normalized whitespace matching
 */
class NormalizedMatchStrategy implements LocationStrategy {
  name = 'normalized';
  
  find(claimText: string, documentText: string): FactLocation | null {
    const normalizedClaim = claimText.replace(/\s+/g, ' ').trim();
    const normalizedDoc = documentText.replace(/\s+/g, ' ');
    const startOffset = normalizedDoc.indexOf(normalizedClaim);
    
    if (startOffset !== -1) {
      // Find the original text boundaries
      const endOffset = findOriginalEndOffset(documentText, startOffset, normalizedClaim.length);
      const originalText = documentText.substring(startOffset, endOffset);
      return createFactLocation(startOffset, originalText, documentText);
    }
    return null;
  }
}

/**
 * Strategy for fuzzy matching using key phrases
 */
class KeyPhraseStrategy implements LocationStrategy {
  name = 'keyPhrase';
  
  find(claimText: string, documentText: string): FactLocation | null {
    const keyPhrase = extractKeyPhrase(claimText);
    if (!keyPhrase || keyPhrase.length <= LIMITS.MIN_KEY_PHRASE_LENGTH) {
      return null;
    }
    
    const startOffset = documentText.indexOf(keyPhrase);
    if (startOffset !== -1) {
      // Expand to sentence boundaries
      const expanded = expandToSentence(documentText, startOffset, keyPhrase.length);
      return createFactLocation(expanded.start, expanded.text, documentText);
    }
    return null;
  }
}

/**
 * Strategy for context-based matching
 */
class ContextMatchStrategy implements LocationStrategy {
  name = 'context';
  
  find(claimText: string, documentText: string, context?: string): FactLocation | null {
    if (!context) return null;
    
    const startOffset = documentText.indexOf(context);
    if (startOffset !== -1) {
      // Look for the claim within the context
      const claimInContext = context.indexOf(claimText);
      if (claimInContext !== -1) {
        const absoluteStart = startOffset + claimInContext;
        return createFactLocation(absoluteStart, claimText, documentText);
      }
    }
    return null;
  }
}

// Location finding strategies in order of preference
const strategies: LocationStrategy[] = [
  new ExactMatchStrategy(),
  new NormalizedMatchStrategy(),
  new ContextMatchStrategy(),
  new KeyPhraseStrategy()
];

/**
 * Find the location of a fact claim in the document text
 * Uses multiple strategies to handle variations in text
 */
export function findFactLocation(
  claimText: string,
  documentText: string,
  options: {
    allowFuzzy?: boolean;
    context?: string;
  } = {}
): FactLocation | null {
  // Try each strategy in order
  for (const strategy of strategies) {
    // Skip fuzzy strategies if not allowed
    if (!options.allowFuzzy && strategy.name === 'keyPhrase') {
      continue;
    }
    
    const location = strategy.find(claimText, documentText, options.context);
    if (location) {
      return location;
    }
  }
  
  return null;
}

/**
 * Find locations for multiple facts in parallel
 */
export async function findMultipleFactLocations(
  claims: Array<{ text: string; context?: string }>,
  documentText: string,
  options: { allowFuzzy?: boolean } = {}
): Promise<Map<string, FactLocation | null>> {
  const results = new Map<string, FactLocation | null>();

  // Process all claims in parallel
  const locationPromises = claims.map(async (claim) => {
    // Run in next tick to ensure true parallelism
    await new Promise(resolve => setImmediate(resolve));
    
    const location = findFactLocation(claim.text, documentText, {
      ...options,
      context: claim.context
    });
    
    return { claimText: claim.text, location };
  });

  // Wait for all locations to be found
  const locations = await Promise.all(locationPromises);
  
  // Build the results map
  for (const { claimText, location } of locations) {
    results.set(claimText, location);
  }

  return results;
}

/**
 * Create a FactLocation object from offset and text
 */
function createFactLocation(
  startOffset: number,
  text: string,
  documentText: string
): FactLocation {
  const endOffset = startOffset + text.length;
  const lineNumber = getLineNumberAtPosition(documentText, startOffset);
  const lineText = getLineAtPosition(documentText, startOffset);

  return {
    startOffset,
    endOffset,
    quotedText: text,
    lineNumber,
    lineText
  };
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
 * Extract a key phrase from a claim for fuzzy matching
 */
function extractKeyPhrase(claim: string): string | null {
  // Look for quoted text first
  const quotedMatch = claim.match(/"([^"]+)"/);
  if (quotedMatch) {
    return quotedMatch[1];
  }

  // Look for numbers with context
  const numberMatch = claim.match(/(\d+(?:\.\d+)?(?:%|billion|million|thousand)?)\s+\w+/);
  if (numberMatch) {
    return numberMatch[0];
  }

  // Look for dates
  const dateMatch = claim.match(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b/i);
  if (dateMatch) {
    return dateMatch[0];
  }

  // Extract the middle portion of the claim (usually most specific)
  const words = claim.split(/\s+/);
  if (words.length > 6) {
    const start = Math.floor(words.length / 4);
    const end = start + Math.floor(words.length / 2);
    return words.slice(start, end).join(' ');
  }

  return null;
}

/**
 * Expand a match to sentence boundaries
 */
function expandToSentence(
  text: string,
  startOffset: number,
  length: number
): { start: number; text: string } {
  // Find sentence start
  let sentenceStart = startOffset;
  while (sentenceStart > 0) {
    const char = text[sentenceStart - 1];
    if (/[.!?]\s/.test(text.substring(sentenceStart - 2, sentenceStart))) {
      break;
    }
    sentenceStart--;
  }

  // Find sentence end
  let sentenceEnd = startOffset + length;
  while (sentenceEnd < text.length) {
    const char = text[sentenceEnd];
    if (/[.!?]/.test(char)) {
      sentenceEnd++;
      break;
    }
    sentenceEnd++;
  }

  return {
    start: sentenceStart,
    text: text.substring(sentenceStart, sentenceEnd).trim()
  };
}