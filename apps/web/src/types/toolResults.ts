/**
 * Type definitions for tool results
 * 
 * These interfaces define the shape of results returned by various AI tools
 * to ensure type safety in the UI components.
 */

import type {
  DocumentChunkerOutput,
  CheckMathOutput,
  CheckMathWithMathJSOutput,
  CheckSpellingGrammarOutput,
  SpellingGrammarError,
  ExtractFactualClaimsOutput,
  ExtractedFactualClaim,
  ExtractForecastingClaimsOutput,
  ExtractedForecast,
  ExtractMathExpressionsOutput,
  ExtractedMathExpression,
  DetectLanguageConventionOutput,
  MathErrorDetails,
  MathVerificationStatus
} from '@roast/ai';

// Re-export tool types with backward-compatible names
export type SpellingError = SpellingGrammarError;
export type FactualClaim = ExtractedFactualClaim;
export type ForecastingClaim = ExtractedForecast;
export type MathExpression = ExtractedMathExpression;
export type MathError = MathErrorDetails;

// Tool result types (using AI package types)
export type SpellingCheckResult = CheckSpellingGrammarOutput;
export type FactualClaimsResult = ExtractFactualClaimsOutput;
export type ForecastingResult = ExtractForecastingClaimsOutput;
export type MathExpressionResult = ExtractMathExpressionsOutput;
export type LanguageConventionResult = DetectLanguageConventionOutput;
export type ChunkingResult = DocumentChunkerOutput;

// Additional UI-specific wrapper types
export interface MathCheckResult {
  errors: MathError[];
  summary: {
    totalErrors: number;
    errorsByCategory: Record<string, number>;
    overallScore: number;
  };
}

// Extract nested types for backward compatibility
export type DocumentChunk = DocumentChunkerOutput['chunks'][0];
export type LanguageIndicator = DetectLanguageConventionOutput['evidence'][0];

// Generic tool result wrapper
export interface ToolResult<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: unknown;
  };
  metadata: {
    processingTime: number;
    tokensUsed?: number;
    modelUsed?: string;
    cached?: boolean;
  };
}

// Comment structure for AI-generated comments
export interface AIComment {
  id: string;
  text: string;
  location: {
    lineNumber: number;
    startChar?: number;
    endChar?: number;
  };
  severity: 'error' | 'warning' | 'info' | 'success';
  category: string;
  tags?: string[];
  confidence?: number;
}

// Export type guards
export function isMathCheckResult(result: unknown): result is MathCheckResult {
  return (
    typeof result === 'object' &&
    result !== null &&
    'errors' in result &&
    Array.isArray((result as any).errors)
  );
}

export function isSpellingCheckResult(result: unknown): result is SpellingCheckResult {
  return (
    typeof result === 'object' &&
    result !== null &&
    'errors' in result &&
    'languageConvention' in result
  );
}

export function isChunkingResult(result: unknown): result is ChunkingResult {
  return (
    typeof result === 'object' &&
    result !== null &&
    'chunks' in result &&
    Array.isArray((result as any).chunks)
  );
}