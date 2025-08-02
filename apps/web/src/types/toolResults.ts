/**
 * Type definitions for tool results
 * 
 * These interfaces define the shape of results returned by various AI tools
 * to ensure type safety in the UI components.
 */

// Math checking tool results
export interface MathError {
  expression: string;
  lineNumber: number;
  severity: 'error' | 'warning' | 'info';
  category: string;
  message: string;
  suggestion?: string;
  expectedResult?: string | number;
  actualResult?: string | number;
}

export interface MathCheckResult {
  errors: MathError[];
  summary: {
    totalErrors: number;
    errorsByCategory: Record<string, number>;
    overallScore: number;
  };
}

// Spelling and grammar checking results
export interface SpellingError {
  text: string;
  lineNumber: number;
  startChar: number;
  endChar: number;
  type: 'spelling' | 'grammar' | 'punctuation' | 'style';
  severity: 'error' | 'warning' | 'suggestion';
  message: string;
  suggestions: string[];
  confidence: number;
}

export interface SpellingCheckResult {
  errors: SpellingError[];
  languageConvention: 'US' | 'UK' | 'mixed' | 'unknown';
  summary: {
    totalErrors: number;
    errorsByType: Record<string, number>;
    readabilityScore?: number;
  };
}

// Document chunking results
export interface DocumentChunk {
  id: string;
  content: string;
  type: 'heading' | 'paragraph' | 'code' | 'list' | 'blockquote' | 'mixed';
  startLine: number;
  endLine: number;
  wordCount: number;
  metadata: {
    headingLevel?: number;
    headingText?: string;
    language?: string; // for code blocks
    listType?: 'ordered' | 'unordered';
  };
}

export interface ChunkingResult {
  chunks: DocumentChunk[];
  summary: {
    totalChunks: number;
    totalWords: number;
    chunksByType: Record<string, number>;
    averageChunkSize: number;
  };
}

// Factual claims extraction
export interface FactualClaim {
  claim: string;
  lineNumber: number;
  confidence: number;
  category: 'statistical' | 'historical' | 'scientific' | 'quotation' | 'general';
  verifiable: boolean;
  sources?: string[];
  context: string;
}

export interface FactualClaimsResult {
  claims: FactualClaim[];
  summary: {
    totalClaims: number;
    claimsByCategory: Record<string, number>;
    verifiableClaims: number;
  };
}

// Forecasting claims extraction
export interface ForecastingClaim {
  prediction: string;
  binaryQuestion: string;
  timeframe: {
    start?: string;
    end: string;
  };
  confidence?: number;
  importance: 'high' | 'medium' | 'low';
  robustness: number; // 0-1 score
  lineNumber: number;
  context: string;
}

export interface ForecastingResult {
  predictions: ForecastingClaim[];
  summary: {
    totalPredictions: number;
    predictionsByImportance: Record<string, number>;
    averageRobustness: number;
    timeframeDistribution: Record<string, number>;
  };
}

// Language convention detection
export interface LanguageIndicator {
  word: string;
  convention: 'US' | 'UK';
  lineNumber: number;
  context: string;
  category: 'spelling' | 'vocabulary' | 'grammar';
}

export interface LanguageConventionResult {
  indicators: LanguageIndicator[];
  dominantConvention: 'US' | 'UK' | 'mixed' | 'unclear';
  confidence: number;
  summary: {
    usIndicators: number;
    ukIndicators: number;
    mixedUsage: boolean;
    recommendedConvention?: 'US' | 'UK';
  };
}

// Math expression extraction
export interface MathExpression {
  expression: string;
  lineNumber: number;
  type: 'equation' | 'calculation' | 'formula' | 'inequality';
  isValid: boolean;
  variables?: string[];
  result?: string | number;
  context: string;
}

export interface MathExpressionResult {
  expressions: MathExpression[];
  summary: {
    totalExpressions: number;
    expressionsByType: Record<string, number>;
    validExpressions: number;
    uniqueVariables: string[];
  };
}

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