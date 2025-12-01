// Core AI utilities for RoastMyPost
// Note: claude/wrapper is server-only (uses logger with AsyncLocalStorage), exported from ./server
// Test utilities are not exported from main index - import them directly if needed
// export * from './claude/testUtils';
// export * from './claude/mockHelpers';
export * from './helicone/api-client';
export * from './helicone/costFetcher';
// Export the new simple session manager
export { 
  HeliconeSessionManager,
  setGlobalSessionManager,
  getGlobalSessionManager,
  getCurrentHeliconeHeaders
} from './helicone/simpleSessionManager';
export type { SimpleSessionConfig } from './helicone/simpleSessionManager';
export * from './utils/tokenUtils';
export * from './utils/anthropic';
export * from './utils/retryUtils';
export * from './utils/openrouter';
export * from './types';

// Configuration
export { initializeAI, type AIConfig } from './config';

// Document analysis workflows - server-only (uses logger), exported from ./server
// export * from './workflows';

// Cost calculation utilities
export { 
  calculateApiCostInDollars, 
  mapModelToCostModel,
  calculateCost,
  OPENROUTER_PRICING,
  type ModelName
} from './utils/costCalculator';

// Document metadata utilities moved to @roast/domain

// Tools system - types and configs only (implementations in server.ts)
export * from './tools/configs';
// Export generated schemas and READMEs for client-side use
export { toolSchemas, getToolSchema, type ToolId } from './tools/generated-schemas';
export { toolReadmes, getToolReadme } from './tools/generated-readmes';
// generateClaimEvaluatorPrompt available via @roast/ai/tools/claim-evaluator/prompt
export type { 
  Tool,
  ToolContext,
  ToolConfig
} from './tools/base/Tool';
// Tool output types - imported directly to avoid pulling in implementations
export type { DocumentChunkerOutput } from './tools/document-chunker';
export type { TextLocationFinderOutput } from './tools/smart-text-searcher';
export type { CheckMathOutput } from './tools/math-validator-llm';
export type { CheckMathAgenticOutput as CheckMathWithMathJSOutput } from './tools/math-validator-mathjs/types';
export type { CheckSpellingGrammarOutput, SpellingGrammarError } from './tools/spelling-grammar-checker';
export type { ExtractFactualClaimsOutput, ExtractedFactualClaim } from './tools/factual-claims-extractor';
export type { ExtractForecastingClaimsOutput, ExtractedForecast } from './tools/binary-forecasting-claims-extractor';
export type { ExtractMathExpressionsOutput, ExtractedMathExpression } from './tools/math-expressions-extractor';
export type { DetectLanguageConventionOutput } from './tools/language-convention-detector';
export type { MathErrorDetails, MathVerificationStatus } from './tools/shared/math-schemas';

// Analysis plugins - types only (implementations use logger, exported from ./server)
export type {
  FullDocumentAnalysisResult
} from './analysis-plugins/PluginManager';

// Analysis plugin types
export type { Finding } from './analysis-plugins/types';
export { PluginType } from './analysis-plugins/types/plugin-types';

// Document and agent types (avoid conflicts with existing exports)
export * from './types/agentSchema';
export type { 
  Document, 
  DocumentsCollection,
  RawDocument, 
  RawDocumentReview,
  RawDocumentsCollection,
  Evaluation,
  transformDocument,
  transformDocumentsCollection
} from './types/documents';
export * from './types/llmSchema';
export {
  DEFAULT_TEMPERATURE,
  DEFAULT_LLM_TIMEOUT,
  COMPREHENSIVE_ANALYSIS_TIMEOUT,
  HIGHLIGHT_EXTRACTION_TIMEOUT,
  SELF_CRITIQUE_TIMEOUT
} from './types/openai';

// Export centralized timeout utilities
export {
  withTimeout,
  createTimeoutWrapper,
  TimeoutPresets,
  Timeouts,
  type TimeoutOptions
} from './utils/timeout';

// Shared utilities (logger is internal-only, not exported)
export * from './shared/utils/xml';
export type {
  Comment,
  CommentMetadata,
  ToolChainResult,
  DocumentLocation,
  LanguageConvention,
  LanguageConventionOption
} from './shared/types';

export {
  DEFAULT_GENERAL_TIMEOUT,
  getRandomElement,
  getPercentile,
  getPercentileNumber,
  countWords
} from './shared/types';