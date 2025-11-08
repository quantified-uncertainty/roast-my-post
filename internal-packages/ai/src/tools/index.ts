// Tools system exports
export * from './base/Tool';
export * from './base/types';
export * from './base/testRunner';
export { toolRegistry } from './registry';

// Centralized tool registry
export * from './all-tools';

// Shared utilities
export * from './shared/cache-utils';
export * from './shared/math-schemas';

// Individual tools - export the ones that are commonly used
export { default as checkMathTool } from './math-validator-llm';
export { default as checkMathWithMathJsTool } from './math-validator-mathjs';
export { default as checkMathHybridTool } from './math-validator-hybrid';
export { default as factCheckerTool } from './fact-checker';
export { default as forecasterTool } from './binary-forecaster';
export { default as fuzzyTextLocatorTool } from './smart-text-searcher';
export { default as documentChunkerTool } from './document-chunker';
export { default as extractForecastingClaimsTool } from './binary-forecasting-claims-extractor';
export { default as extractFactualClaimsTool } from './factual-claims-extractor';
export { default as checkSpellingGrammarTool } from './spelling-grammar-checker';
export { default as extractMathExpressionsTool } from './math-expressions-extractor';
export { detectLanguageConventionTool } from './language-convention-detector';
export { default as perplexityResearchTool } from './perplexity-researcher';
export { linkValidator } from './link-validator';
export { default as claimEvaluatorTool } from './claim-evaluator';
export { analyzeClaimEvaluation } from './claim-evaluator';
export { default as fallacyReviewTool } from './fallacy-review';

// Export link validator utilities and types
export { 
  generateLinkHighlights,
  generateLinkAnalysisAndSummary,
  generateLinkAnalysisReport,
  generateNoLinksReport,
  type LinkAnalysis 
} from './link-validator';

// Export tool-specific types
export type { DocumentChunkerOutput } from './document-chunker';
export type { TextLocationFinderOutput } from './smart-text-searcher';
export type { CheckMathOutput } from './math-validator-llm';
export type { CheckMathAgenticOutput as CheckMathWithMathJSOutput } from './math-validator-mathjs/types';
export type { CheckSpellingGrammarOutput, SpellingGrammarError } from './spelling-grammar-checker';
export type { ExtractFactualClaimsOutput, ExtractedFactualClaim } from './factual-claims-extractor';
export type { ExtractForecastingClaimsOutput, ExtractedForecast } from './binary-forecasting-claims-extractor';
export type { ExtractMathExpressionsOutput, ExtractedMathExpression } from './math-expressions-extractor';
export type { DetectLanguageConventionOutput } from './language-convention-detector';
export type { ClaimEvaluatorOutput, ModelEvaluation } from './claim-evaluator';
export type { FallacyReviewInput, FallacyReviewOutput } from './fallacy-review/types';

// Re-export shared math types
export type { MathErrorDetails, MathVerificationStatus } from './shared/math-schemas';