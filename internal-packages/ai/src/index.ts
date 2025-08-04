// Core AI utilities for RoastMyPost
export * from './claude/wrapper';
export * from './claude/testUtils';
export * from './claude/mockHelpers';
export * from './helicone/api-client';
export * from './helicone/costFetcher';
// Export sessionContext types but not the implementation (uses Node.js built-ins)
export type { HeliconeSessionConfig } from './helicone/sessions';
export * from './helicone/sessions';
export * from './utils/tokenUtils';
export * from './utils/anthropic';
export * from './utils/retryUtils';
export * from './types';

// Configuration
export { initializeAI, type AIConfig } from './config';

// Tools system - types and configs only (implementations in server.ts)
export * from './tools/configs';
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
  ChunkRouter,
  createChunks,
  FactCheckPlugin,
  ForecastPlugin,
  MathPlugin,
  SpellingPlugin
} from './analysis-plugins';

// Analysis plugin types
export type { Finding } from './analysis-plugins/types';

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
  COMPREHENSIVE_ANALYSIS_TIMEOUT,
  HIGHLIGHT_EXTRACTION_TIMEOUT,
  SELF_CRITIQUE_TIMEOUT,
  withTimeout
} from './types/openai';

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
  DEFAULT_TIMEOUT,
  getRandomElement,
  getPercentile,
  getPercentileNumber,
  countWords
} from './shared/types';