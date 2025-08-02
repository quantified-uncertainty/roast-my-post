/**
 * Shared types for AI package
 * These types are needed by tools and plugins but should remain independent
 * of the web application's database schema
 */

/**
 * Basic comment structure for document annotations
 */
export interface Comment {
  id?: string;
  content?: string;
  description?: string; // Alternative to content
  startLine?: number;
  endLine?: number;
  startChar?: number;
  endChar?: number;
  agentId?: string;
  type?: 'suggestion' | 'error' | 'info' | 'warning' | 'success';
  category?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  metadata?: Record<string, any>;
  
  // Plugin-specific properties
  importance?: number;
  grade?: number;
  isValid?: boolean;
  header?: string;
  level?: 'error' | 'warning' | 'info' | 'suggestion' | 'success';
  source?: string;
  title?: string;
  observation?: string;
  significance?: string;
  
  highlight?: {
    startLine?: number;
    endLine?: number;
    startChar?: number;
    endChar?: number;
    startOffset: number;      // Required to match database schema
    endOffset: number;        // Required to match database schema
    quotedText: string;       // Required to match database schema
    isValid: boolean;         // Required to match database schema
    prefix?: string;
    error?: string;
  };
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
export const DEFAULT_TIMEOUT = 60000; // 60 seconds

/**
 * Wrap a promise with a timeout
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = DEFAULT_TIMEOUT,
  timeoutMessage = 'Operation timed out'
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs)
    ),
  ]);
}

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