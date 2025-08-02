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

// Tool output/result types
export type ToolCheckMathResult = CheckMathOutput;
export type ToolCheckMathWithMathJSResult = CheckMathWithMathJSOutput;
export type ToolSpellingCheckResult = CheckSpellingGrammarOutput;
export type ToolFactualClaimsResult = ExtractFactualClaimsOutput;
export type ToolForecastingResult = ExtractForecastingClaimsOutput;
export type ToolMathExpressionResult = ExtractMathExpressionsOutput;
export type ToolLanguageConventionResult = DetectLanguageConventionOutput;
export type ToolChunkingResult = DocumentChunkerOutput;

// Tool entity types (items found/extracted by tools)
export type ToolSpellingError = SpellingGrammarError;
export type ToolFactualClaim = ExtractedFactualClaim;
export type ToolForecastingClaim = ExtractedForecast;
export type ToolMathExpression = ExtractedMathExpression;
export type ToolMathError = MathErrorDetails;
export type ToolMathVerificationStatus = MathVerificationStatus;

// Backward compatibility aliases (to avoid breaking existing code)
export type SpellingError = ToolSpellingError;
export type FactualClaim = ToolFactualClaim;
export type ForecastingClaim = ToolForecastingClaim;
export type MathExpression = ToolMathExpression;
export type MathError = ToolMathError;
export type SpellingCheckResult = ToolSpellingCheckResult;
export type FactualClaimsResult = ToolFactualClaimsResult;
export type ForecastingResult = ToolForecastingResult;
export type MathExpressionResult = ToolMathExpressionResult;
export type LanguageConventionResult = ToolLanguageConventionResult;
export type ChunkingResult = ToolChunkingResult;

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