/**
 * Common types for plugin result processing
 */

export interface MathExtractResult {
  contextImportanceScore?: number;
  complexityScore?: number;
}

export interface ForecastExtractResult {
  importanceScore?: number;
  precisionScore?: number;
  verifiabilityScore?: number;
  robustnessScore?: number;
}

export interface ForecastResult {
  verdict?: string;
  confidence?: number;
}

export interface FactExtractResult {
  importanceScore?: number;
}

export interface FactVerifyResult {
  verdict?: 'true' | 'false' | 'unknown';
  confidence?: number;
}