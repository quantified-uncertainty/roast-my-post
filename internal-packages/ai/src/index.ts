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
// Client-safe openrouter types and constants (no async API functions)
export * from './utils/openrouter-types';
export * from './utils/allModels';
// Client-safe reasoning budget utilities (no logger dependency)
export * from './utils/reasoningBudget-client';
export * from './utils/modelConfigResolver';
export * from './types';
// Export common types (note: ReasoningEffort is also exported from openrouter with same definition,
// and ReasoningConfig has different meaning in openrouter - profile config vs API format)
export {
  type ReasoningConfig as ProfileReasoningConfig,
  type ProviderPreferences,
  type ActualApiParams,
  type ApiResponseMetrics,
  EFFORT_TO_BUDGET_TOKENS,
  effortToBudgetTokens,
} from './types/common';

// Configuration
export { initializeAI, type AIConfig } from './config';
export { DEFAULT_ANALYSIS_MODEL, DEFAULT_SEARCH_MODEL } from './constants';

// Cost calculation
export {
  calculateApiCostInDollars,
  mapModelToCostModel,
  calculateCost,
  OPENROUTER_PRICING,
  type ModelName
} from './utils/costCalculator';

// Unified usage metrics
export {
  type UnifiedUsageMetrics,
  type OpenRouterRawUsage,
  type AnthropicRawUsage,
  fromOpenRouterUsage,
  fromAnthropicUsage,
  calculateAnthropicCost,
  getAnthropicPricing,
  formatCost,
  aggregateUsageMetrics,
  ANTHROPIC_PRICING,
} from './utils/usageMetrics';

// Tool configs and generated metadata
export * from './tools/configs';
export { toolSchemas, getToolSchema, type ToolId } from './tools/generated-schemas';
export { toolReadmes, getToolReadme } from './tools/generated-readmes';

// Default prompts for fallacy extractor (used by profile editor UI)
export {
  DEFAULT_EXTRACTOR_SYSTEM_PROMPT,
  DEFAULT_EXTRACTOR_USER_PROMPT,
} from './tools/fallacy-extractor/prompts';

// Tool types - client-safe imports from types.ts (no logger dependency)
// NOTE: Tool class type is server-only, import from @roast/ai/server
export type { ToolContext, ToolConfig } from './tools/base/types';

// TEMPORARILY COMMENTED OUT - These pull in server dependencies via Tool.ts imports
// TODO: Create separate types files for each tool to avoid this
// export type { DocumentChunkerOutput } from './tools/document-chunker';
// export type { TextLocationFinderOutput } from './tools/smart-text-searcher';
// export type { CheckMathOutput } from './tools/math-validator-llm';
// export type { CheckMathAgenticOutput as CheckMathWithMathJSOutput } from './tools/math-validator-mathjs/types';
// export type { CheckSpellingGrammarOutput, SpellingGrammarError } from './tools/spelling-grammar-checker';
// export type { ExtractFactualClaimsOutput, ExtractedFactualClaim } from './tools/factual-claims-extractor';
// export type { ExtractForecastingClaimsOutput, ExtractedForecast } from './tools/binary-forecasting-claims-extractor';
// export type { ExtractMathExpressionsOutput, ExtractedMathExpression } from './tools/math-expressions-extractor';
// export type { DetectLanguageConventionOutput } from './tools/language-convention-detector';
// export type { MathErrorDetails, MathVerificationStatus } from './tools/shared/math-schemas';
// export type { FullDocumentAnalysisResult } from './analysis-plugins/PluginManager';
// export type { Finding } from './analysis-plugins/types';
// export { PluginType } from './analysis-plugins/types/plugin-types';

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
  countWords,
  truncateToWords
} from './shared/types';

// Claim evaluator prompt generation (client-safe)
export {
  generateClaimEvaluatorPrompt,
  DEFAULT_EXPLANATION_LENGTH,
  DEFAULT_PROMPT_TEMPLATE
} from './tools/claim-evaluator/prompt';
