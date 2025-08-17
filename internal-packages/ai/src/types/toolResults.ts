/**
 * Type definitions for tool results and outputs
 */

import type { Comment } from '../shared/types';

/**
 * Base tool result that all tool outputs should extend
 */
export interface BaseToolResult {
  success: boolean;
  error?: string;
}

/**
 * Math tool result
 */
export interface MathToolResult extends BaseToolResult {
  errors: Array<{
    expression: string;
    error: string;
    lineNumber?: number;
  }>;
  verifications?: Array<{
    expression: string;
    result: string | number | boolean;
  }>;
}

/**
 * Spelling/Grammar tool result
 */
export interface SpellingToolResult extends BaseToolResult {
  errors: Array<{
    text: string;
    correction?: string;
    type: 'spelling' | 'grammar';
    lineNumber?: number;
  }>;
}

/**
 * Fact checking tool result
 */
export interface FactCheckResult extends BaseToolResult {
  claims: Array<{
    claim: string;
    verdict: 'supported' | 'disputed' | 'uncertain';
    evidence?: string;
    confidence?: number;
  }>;
  perplexityData?: {
    searchQuery: string;
    sources: Array<{
      url: string;
      title?: string;
      snippet?: string;
    }>;
  };
}

/**
 * Link validation result
 */
export interface LinkValidationResult extends BaseToolResult {
  validations: Array<{
    url: string;
    valid: boolean;
    statusCode?: number;
    error?: string;
  }>;
}

/**
 * Forecast extraction result
 */
export interface ForecastResult extends BaseToolResult {
  forecasts: Array<{
    question: string;
    probability: number;
    reasoning: string;
    timeframe?: string;
  }>;
}

/**
 * Generic plugin result with comments
 */
export interface PluginResult extends BaseToolResult {
  comments: Comment[];
  metadata?: Record<string, unknown>;
}

/**
 * Base type that all tool results must satisfy
 * This allows for flexibility while maintaining type safety
 */
export type ToolResult = Record<string, unknown>;

/**
 * Type guard functions
 */
export function isMathToolResult(result: unknown): result is MathToolResult {
  return typeof result === 'object' && result !== null && 'errors' in result && Array.isArray((result as MathToolResult).errors);
}

export function isSpellingToolResult(result: unknown): result is SpellingToolResult {
  return typeof result === 'object' && result !== null && 'errors' in result && Array.isArray((result as SpellingToolResult).errors);
}

export function isFactCheckResult(result: unknown): result is FactCheckResult {
  return typeof result === 'object' && result !== null && 'claims' in result && Array.isArray((result as FactCheckResult).claims);
}

export function isPluginResult(result: unknown): result is PluginResult {
  return typeof result === 'object' && result !== null && 'comments' in result && Array.isArray((result as PluginResult).comments);
}