/**
 * @roast/ai - Client-safe exports
 *
 * This index exports types, schemas, and utilities safe for browser/client-side use.
 * For server-only exports (tools, plugins, workflows), use @roast/ai/server
 */

// Helicone tracking
export * from './helicone/api-client';
export * from './helicone/costFetcher';
export {
  HeliconeSessionManager,
  setGlobalSessionManager,
  getGlobalSessionManager,
  getCurrentHeliconeHeaders
} from './helicone/simpleSessionManager';
export type { SimpleSessionConfig } from './helicone/simpleSessionManager';

// Utilities
export * from './utils/tokenUtils';
export * from './utils/anthropic';
export * from './utils/retryUtils';
export * from './utils/openrouter';
export * from './types';

// Configuration
export { initializeAI, type AIConfig } from './config';

// Cost calculation
export {
  calculateApiCostInDollars,
  mapModelToCostModel,
  calculateCost,
  OPENROUTER_PRICING,
  type ModelName
} from './utils/costCalculator';

// Tool configs and generated metadata
export * from './tools/configs';
export { toolSchemas, getToolSchema, type ToolId } from './tools/generated-schemas';
export { toolReadmes, getToolReadme } from './tools/generated-readmes';

// Tool types (implementations in @roast/ai/server)
export type { Tool, ToolContext, ToolConfig } from './tools/base/Tool';
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

// Plugin types (implementations in @roast/ai/server)
export type { FullDocumentAnalysisResult } from './analysis-plugins/PluginManager';
export type { Finding } from './analysis-plugins/types';
export { PluginType } from './analysis-plugins/types/plugin-types';

// Document and agent schemas
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

// Timeout utilities
export {
  withTimeout,
  createTimeoutWrapper,
  TimeoutPresets,
  Timeouts,
  type TimeoutOptions
} from './utils/timeout';

// Shared utilities
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

// Claim evaluator prompt generation (client-safe)
export {
  generateClaimEvaluatorPrompt,
  DEFAULT_EXPLANATION_LENGTH,
  DEFAULT_PROMPT_TEMPLATE
} from './tools/claim-evaluator/prompt';