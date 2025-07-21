/**
 * Location finder for Fact Check Plugin
 * Finds the exact location of facts in document text
 */

import { getLineNumberAtPosition, getLineAtPosition } from "../../utils/textHelpers";

export interface FactLocation {
  startOffset: number;
  endOffset: number;
  quotedText: string;
  lineNumber: number;
  lineText: string;
}

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
  // Strategy 1: Direct exact match
  let startOffset = documentText.indexOf(claimText);
  if (startOffset !== -1) {
    return createFactLocation(startOffset, claimText, documentText);
  }

  // Strategy 2: Try with normalized whitespace
  const normalizedClaim = claimText.replace(/\s+/g, ' ').trim();
  const normalizedDoc = documentText.replace(/\s+/g, ' ');
  startOffset = normalizedDoc.indexOf(normalizedClaim);
  if (startOffset !== -1) {
    // Find the original text boundaries
    const endOffset = findOriginalEndOffset(documentText, startOffset, normalizedClaim.length);
    const originalText = documentText.substring(startOffset, endOffset);
    return createFactLocation(startOffset, originalText, documentText);
  }

  // Strategy 3: Try to find key phrases from the claim
  if (options.allowFuzzy) {
    const keyPhrase = extractKeyPhrase(claimText);
    if (keyPhrase && keyPhrase.length > 10) {
      startOffset = documentText.indexOf(keyPhrase);
      if (startOffset !== -1) {
        // Expand to sentence boundaries
        const expanded = expandToSentence(documentText, startOffset, keyPhrase.length);
        return createFactLocation(expanded.start, expanded.text, documentText);
      }
    }
  }

  // Strategy 4: Use context if provided
  if (options.context) {
    startOffset = documentText.indexOf(options.context);
    if (startOffset !== -1) {
      // Look for the claim within the context
      const contextEndOffset = startOffset + options.context.length;
      const claimInContext = options.context.indexOf(claimText);
      if (claimInContext !== -1) {
        const absoluteStart = startOffset + claimInContext;
        return createFactLocation(absoluteStart, claimText, documentText);
      }
    }
  }

  return null;
}

/**
 * Find locations for multiple facts in a single pass
 */
export function findMultipleFactLocations(
  claims: Array<{ text: string; context?: string }>,
  documentText: string,
  options: { allowFuzzy?: boolean } = {}
): Map<string, FactLocation | null> {
  const results = new Map<string, FactLocation | null>();

  for (const claim of claims) {
    const location = findFactLocation(claim.text, documentText, {
      ...options,
      context: claim.context
    });
    results.set(claim.text, location);
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