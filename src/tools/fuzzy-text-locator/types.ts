/**
 * Shared types for text location finding
 */

export interface TextLocation {
  startOffset: number;
  endOffset: number;
  quotedText: string;
  strategy: string;
  confidence: number;
}

export interface TextLocationOptions {
  // Basic options
  normalizeQuotes?: boolean;
  partialMatch?: boolean;
  caseSensitive?: boolean;
  
  // Fuzzy matching options
  maxTypos?: number; // Maximum number of typos/errors allowed in fuzzy search
  
  // LLM options
  useLLMFallback?: boolean;
  llmContext?: string; // Context to help LLM understand the search
  pluginName?: string; // For tracking/logging purposes
}

// Keep old names as aliases for backward compatibility (to be removed later)
export type SimpleLocationOptions = TextLocationOptions;
export type EnhancedLocationOptions = TextLocationOptions;

export interface DocumentLocation {
  startOffset: number;
  endOffset: number;
  quotedText: string;
}

/**
 * Get line number at a given position in text
 */
export function getLineNumberAtPosition(
  text: string,
  position: number
): number {
  const lines = text.substring(0, position).split("\n");
  return lines.length;
}

/**
 * Get the full line of text at a given position
 */
export function getLineAtPosition(text: string, position: number): string {
  const lines = text.split("\n");
  const lineNumber = getLineNumberAtPosition(text, position);
  return lines[lineNumber - 1] || "";
}