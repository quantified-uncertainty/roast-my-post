/**
 * Shared types for AI package
 * These types are needed by tools and plugins but should remain independent
 * of the web application's database schema
 */

import type { ToolResult } from '../types/toolResults';

/**
 * Tool result in the analysis chain
 */
export interface ToolChainResult {
  toolName: string;
  stage: 'extraction' | 'verification' | 'enhancement' | 'generation';
  timestamp: string;
  result: ToolResult;  // Complete, unmodified tool output
}

/**
 * Comment metadata structure with complete tool chain
 */
export interface CommentMetadata {
  // Base processing metadata
  pluginName: string;
  timestamp: string;
  chunkId: string;
  processingTimeMs: number;
  
  // Complete tool results in order of execution
  toolChain: ToolChainResult[];
  
  // Computed summary fields for quick access
  confidence?: number;
  severity?: 'critical' | 'high' | 'medium' | 'low';
  primaryFinding?: string;
  verified?: boolean;
  
  // Additional quick access fields (plugin-specific)
  [key: string]: string | number | boolean | ToolChainResult[] | undefined;
}

/**
 * Comment structure that matches EvaluationComment database schema
 * Used by all plugins for generating document annotations
 */
export interface Comment {
  // Required fields 
  description: string;               // Full explanation/analysis text
  
  // Optional fields for plugin-based comments
  header?: string;                   // Brief summary (provided by plugins)
  level?: 'error' | 'warning' | 'nitpick' | 'info' | 'success' | 'debug';  // Severity level (provided by plugins)
  source?: string;                   // Plugin name (provided by plugins)
  
  // Optional fields  
  importance?: number;               // Importance score (integer in DB)
  grade?: number;                    // Quality/confidence score (integer in DB)
  
  // Location data (will be stored in separate EvaluationHighlight table)
  highlight: DocumentHighlight;
  
  // Complete tool chain metadata (JSON in database)
  metadata?: CommentMetadata;
}

/**
 * Highlight information for text locations in a document
 */
export interface DocumentHighlight {
  startOffset: number;
  endOffset: number;
  quotedText: string;
  isValid: boolean;
  prefix?: string;
  error?: string;
}

/**
 * Document location for text highlighting
 */
export interface DocumentLocation {
  startLine?: number;
  endLine?: number;
  startChar?: number;
  endChar?: number;
  startOffset?: number;
  endOffset?: number;
  quotedText?: string;
  text?: string;
}

/**
 * Language convention types (US or UK English)
 */
export type LanguageConvention = 'US' | 'UK';

/**
 * Language convention options
 */
export type LanguageConventionOption = 'US' | 'UK' | 'auto';

/**
 * Timeout utilities
 */
export const DEFAULT_GENERAL_TIMEOUT = 60000; // 60 seconds

/**
 * Re-export withTimeout from centralized utility for backward compatibility
 * @deprecated Use import from '../utils/timeout' directly
 */
export { withTimeout } from '../utils/timeout';

/**
 * Safe array access utilities
 */
export function getRandomElement<T>(array: T[], fallback: T): T {
  if (array.length === 0) return fallback;
  return array[Math.floor(Math.random() * array.length)] || fallback;
}

export function getPercentile<T>(array: T[], percentile: number): T | undefined {
  if (array.length === 0) return undefined;
  if (percentile < 0 || percentile > 1) return undefined;
  
  const sortedArray = [...array].sort();
  const index = Math.ceil(percentile * sortedArray.length) - 1;
  return sortedArray[Math.max(0, index)];
}

export function getPercentileNumber(array: number[], percentile: number): number | undefined {
  if (array.length === 0) return undefined;
  if (percentile < 0 || percentile > 1) return undefined;
  
  const sortedArray = [...array].sort((a, b) => a - b);
  const index = Math.ceil(percentile * sortedArray.length) - 1;
  return sortedArray[Math.max(0, index)];
}

/**
 * Word counting utility
 */
export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

/**
 * Truncate text to the first N words
 * @param text - The text to truncate
 * @param maxWords - Maximum number of words to keep
 * @returns The truncated text containing at most maxWords words
 */
export function truncateToWords(text: string, maxWords: number): string {
  if (!text || maxWords <= 0) return "";
  
  const words = text.trim().split(/\s+/).filter(word => word.length > 0);
  
  if (words.length <= maxWords) {
    return text;
  }
  
  return words.slice(0, maxWords).join(" ");
}