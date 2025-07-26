/**
 * Utility functions for finding text locations in documents
 * This is now a wrapper around the unified fuzzy-text-locator tool
 */

import type { Comment } from '@/types/documentSchema';
import type { HighlightHint } from '../types';
import { findTextLocation as findTextLocationUnified } from '@/tools/fuzzy-text-locator/core';
import { processLocationsInParallel } from '../../documentAnalysis/shared/parallelLocationUtils';

export interface LocationResult {
  highlight: Comment['highlight'] | null;
  confidence: number;
}

/**
 * Try to locate text in a document using various matching strategies
 * This now delegates to the unified fuzzy-text-locator tool
 */
export async function findTextLocation(
  searchText: string,
  documentText: string,
  options?: {
    lineNumber?: number;
    fuzzyMatch?: boolean;
    maxDistance?: number;
  }
): Promise<LocationResult> {
  const result = await findTextLocationUnified(searchText, documentText, {
    caseSensitive: false,
    normalizeQuotes: true,
    partialMatch: options?.fuzzyMatch,
    maxTypos: options?.fuzzyMatch ? 2 : 0,
  });
  
  if (!result) {
    return { highlight: null, confidence: 0 };
  }
  
  return {
    highlight: {
      startOffset: result.startOffset,
      endOffset: result.endOffset,
      quotedText: result.quotedText,
      isValid: true
    },
    confidence: result.confidence
  };
}

/**
 * Convert a highlight hint to a located finding
 */
export async function locateFinding(
  hint: HighlightHint,
  documentText: string,
  options?: {
    fuzzyMatch?: boolean;
    requireHighConfidence?: boolean;
  }
): Promise<Comment['highlight'] | null> {
  const { requireHighConfidence = false } = options || {};
  
  const result = await findTextLocation(hint.searchText, documentText, {
    lineNumber: hint.lineNumber,
    fuzzyMatch: options?.fuzzyMatch
  });
  
  if (requireHighConfidence && result.confidence < 0.9) {
    return null;
  }
  
  return result.highlight;
}

/**
 * Batch locate multiple findings efficiently
 */
export async function batchLocateFindings(
  hints: HighlightHint[],
  documentText: string,
  options?: {
    fuzzyMatch?: boolean;
    requireHighConfidence?: boolean;
  }
): Promise<Map<string, Comment['highlight'] | null>> {
  return processLocationsInParallel(
    hints,
    (hint) => hint.searchText,
    (hint) => locateFinding(hint, documentText, options)
  );
}