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
export { default as checkMathTool } from './check-math';
export { default as checkMathWithMathJsTool } from './check-math-with-mathjs';
export { default as checkMathHybridTool } from './check-math-hybrid';
export { default as factCheckerTool } from './fact-checker';
export { default as multiFactCheckerTool } from './fact-checker-multi';
export { default as forecasterTool } from './forecaster';
export { default as fuzzyTextLocatorTool } from './fuzzy-text-locator';
export { default as documentChunkerTool } from './document-chunker';
export { default as extractForecastingClaimsTool } from './extract-forecasting-claims';
export { default as extractFactualClaimsTool } from './extract-factual-claims';
export { default as checkSpellingGrammarTool } from './check-spelling-grammar';
export { default as extractMathExpressionsTool } from './extract-math-expressions';
export { detectLanguageConventionTool } from './detect-language-convention';
export { default as perplexityResearchTool } from './perplexity-research';
export { linkValidator } from './link-validator';

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
export type { TextLocationFinderOutput } from './fuzzy-text-locator';
export type { CheckMathOutput } from './check-math';
export type { CheckMathAgenticOutput as CheckMathWithMathJSOutput } from './check-math-with-mathjs/types';
export type { CheckSpellingGrammarOutput, SpellingGrammarError } from './check-spelling-grammar';
export type { ExtractFactualClaimsOutput, ExtractedFactualClaim } from './extract-factual-claims';
export type { ExtractForecastingClaimsOutput, ExtractedForecast } from './extract-forecasting-claims';
export type { ExtractMathExpressionsOutput, ExtractedMathExpression } from './extract-math-expressions';
export type { DetectLanguageConventionOutput } from './detect-language-convention';

// Re-export shared math types
export type { MathErrorDetails, MathVerificationStatus } from './shared/math-schemas';