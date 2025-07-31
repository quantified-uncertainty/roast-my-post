/**
 * Exact text search - fastest but requires perfect match
 */

import { TextLocation } from './types';

export function exactSearch(
  searchText: string,
  documentText: string
): TextLocation | null {
  const foundOffset = documentText.indexOf(searchText);
  
  if (foundOffset === -1) {
    return null;
  }
  
  return {
    startOffset: foundOffset,
    endOffset: foundOffset + searchText.length,
    quotedText: searchText,
    strategy: "exact",
    confidence: 1.0,
  };
}