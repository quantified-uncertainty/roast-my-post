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

export interface SimpleLocationOptions {
  normalizeQuotes?: boolean;
  partialMatch?: boolean;
  context?: string;
}

export interface EnhancedLocationOptions extends SimpleLocationOptions {
  maxDistance?: number;
  caseSensitive?: boolean;
  useLLMFallback?: boolean;
  pluginName?: string;
  documentText?: string;
}

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