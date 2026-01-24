/**
 * Client-safe tool types
 *
 * These types are extracted from tool implementations to avoid pulling in
 * server-side dependencies when importing types for UI components.
 *
 * DO NOT import anything from tool index files or base/Tool.ts here.
 */

import type { LanguageConvention } from '../shared/types';

// ============================================================================
// Document Chunker Types
// ============================================================================

export interface DocumentChunk {
  id: string;
  text: string;
  startOffset: number;
  endOffset: number;
  startLine: number;
  endLine: number;
  metadata: {
    type?: 'paragraph' | 'section' | 'code' | 'list' | 'heading' | 'mixed';
    headingContext?: string[];
    isComplete: boolean;
    confidence: number;
  };
}

export interface DocumentChunkerOutput {
  chunks: DocumentChunk[];
  metadata: {
    totalChunks: number;
    averageChunkSize: number;
    strategy: string;
    warnings?: string[];
  };
}

// ============================================================================
// Text Location Finder Types
// ============================================================================

export interface TextLocationFinderOutput {
  searchText: string;
  found: boolean;
  location?: {
    startOffset: number;
    endOffset: number;
    quotedText: string;
    strategy: string;
    confidence: number;
  };
  error?: string;
  processingTimeMs: number;
  llmUsed?: boolean;
}

// ============================================================================
// Math Validator Types
// ============================================================================

export type MathVerificationStatus = 'verified_true' | 'verified_false' | 'verified_warning' | 'cannot_verify';
export type MathErrorType = 'calculation' | 'logic' | 'unit' | 'notation' | 'conceptual';
export type MathSeverity = 'critical' | 'major' | 'minor';

export interface MathErrorDetails {
  errorType: MathErrorType;
  severity: MathSeverity;
  displayCorrection: string;
  expectedValue?: string;
  actualValue?: string;
  steps?: Array<{
    expression: string;
    result: string;
  }>;
}

export interface MathVerificationDetails {
  mathJsExpression?: string;
  computedValue?: string;
  steps?: Array<{
    expression: string;
    result: string;
  }>;
}

export interface CheckMathOutput {
  statement: string;
  status: MathVerificationStatus;
  explanation: string;
  reasoning: string;
  errorDetails?: MathErrorDetails;
}

// CheckMathWithMathJSOutput is an alias for the agentic math validator output
export interface CheckMathWithMathJSOutput {
  statement: string;
  status: MathVerificationStatus;
  explanation: string;
  verificationDetails?: MathVerificationDetails;
  errorDetails?: MathErrorDetails;
  error?: string;
}

// ============================================================================
// Spelling & Grammar Checker Types
// ============================================================================

export interface SpellingGrammarError {
  text: string;
  correction: string;
  displayCorrection: string;
  type: 'spelling' | 'grammar';
  context?: string;
  importance: number;
  confidence: number;
  description?: string;
  lineNumber?: number;
}

export interface CheckSpellingGrammarOutput {
  errors: SpellingGrammarError[];
  metadata?: {
    totalErrorsFound: number;
    convention: LanguageConvention | 'mixed';
    processingTime?: number;
  };
}

// ============================================================================
// Factual Claims Extractor Types
// ============================================================================

export interface ExtractedFactualClaim {
  exactText: string;
  claim: string;
  topic: string;
  importanceScore: number;
  checkabilityScore: number;
  truthProbability: number;
  highlight?: {
    startOffset: number;
    endOffset: number;
    quotedText: string;
    isValid: boolean;
    prefix?: string;
    error?: string;
  };
}

export interface ExtractFactualClaimsOutput {
  claims: ExtractedFactualClaim[];
  summary: {
    totalFound: number;
    aboveThreshold: number;
    averageQuality: number;
  };
}

// ============================================================================
// Forecasting Claims Extractor Types
// ============================================================================

export interface ExtractedForecast {
  originalText: string;
  thinking: string;
  precisionScore: number;
  verifiabilityScore: number;
  importanceScore: number;
  rewrittenPredictionText: string;
  authorProbability?: number;
  robustnessScore: number;
  resolutionDate?: string;
  minimalProbabilitySpan?: string;
}

export interface ExtractForecastingClaimsOutput {
  forecasts: ExtractedForecast[];
}

// ============================================================================
// Math Expressions Extractor Types
// ============================================================================

export interface ExtractedMathExpression {
  originalText: string;
  hasError: boolean;
  errorType?: MathErrorType;
  errorExplanation?: string;
  correctedVersion?: string;
  displayCorrection?: string;
  complexityScore: number;
  contextImportanceScore: number;
  errorSeverityScore: number;
  simplifiedExplanation?: string;
  verificationStatus: 'verified' | 'unverified' | 'unverifiable';
  severity?: MathSeverity;
}

export interface ExtractMathExpressionsOutput {
  expressions: ExtractedMathExpression[];
}

// ============================================================================
// Language Convention Detector Types
// ============================================================================

export interface DetectLanguageConventionOutput {
  convention: LanguageConvention;
  confidence: number;
  consistency: number;
  evidence: Array<{
    word: string;
    convention: LanguageConvention;
    count: number;
  }>;
  documentType?: {
    type: 'academic' | 'technical' | 'blog' | 'casual' | 'unknown';
    confidence: number;
  };
}
