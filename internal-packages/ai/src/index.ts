// Core AI utilities for RoastMyPost
export * from './claude/wrapper';
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
  getCurrentHeliconeHeaders,
  type SimpleSessionConfig
} from './helicone/simpleSessionManager';
export * from './utils/tokenUtils';
export * from './utils/anthropic';
export * from './utils/retryUtils';
export * from './types';

// Configuration
export { initializeAI, type AIConfig } from './config';

// Document analysis workflows
export * from './workflows';

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
export type { 
  Tool,
  ToolContext,
  ToolConfig
} from './tools/base/Tool';
export type { 
  DocumentChunkerOutput,
  TextLocationFinderOutput,
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
} from './tools/index';

// Analysis plugins - types only (implementations use sessionContext)
export type { 
  FullDocumentAnalysisResult 
} from './analysis-plugins/PluginManager';
export { 
  PluginLogger,
  TextChunk,
  CommentBuilder,
  createChunks,
  FactCheckPlugin,
  ForecastPlugin,
  MathPlugin,
  SpellingPlugin
} from './analysis-plugins';

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

// Shared utilities
export * from './shared/logger';
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