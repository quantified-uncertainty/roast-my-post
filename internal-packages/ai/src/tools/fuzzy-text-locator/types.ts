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
  lineNumberHint?: number; // Optional line number to help narrow search
  
  // Fuzzy matching options
  maxTypos?: number; // Maximum number of typos/errors allowed in fuzzy search
  
  // LLM options
  useLLMFallback?: boolean;
  llmContext?: string; // Context to help LLM understand the search
  pluginName?: string; // For tracking/logging purposes
}