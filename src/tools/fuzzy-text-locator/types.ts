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