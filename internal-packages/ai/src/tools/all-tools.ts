/**
 * Central registry of all available tools
 * This is the single source of truth for tool imports
 *
 * ⚠️ IMPORTANT: When adding a new tool, you must also update:
 * 1. internal-packages/ai/src/tools/registry.ts (add import + register call)
 * 2. internal-packages/ai/src/tools/configs.ts (add tool config)
 */

import checkSpellingGrammarTool from './spelling-grammar-checker';
import extractFactualClaimsTool from './factual-claims-extractor';
import factCheckerTool from './fact-checker';
import checkMathWithMathJsTool from './math-validator-mathjs';
import checkMathTool from './math-validator-llm';
import checkMathHybridTool from './math-validator-hybrid';
import extractMathExpressionsTool from './math-expressions-extractor';
import extractForecastingClaimsTool from './binary-forecasting-claims-extractor';
import documentChunkerTool from './document-chunker';
import fuzzyTextLocatorTool from './smart-text-searcher';
import { detectLanguageConventionTool } from './language-convention-detector';
import forecasterTool from './binary-forecaster';
import { linkValidator } from './link-validator';
import perplexityResearchTool from './perplexity-researcher';
import claimEvaluatorTool from './claim-evaluator';
import fallacyReviewTool from './fallacy-review';
import fallacyExtractorTool from './fallacy-extractor';
import type { Tool } from './base/Tool';

/**
 * List of all tools - IDs are derived from each tool's config.id
 */
const toolsList = [
  checkSpellingGrammarTool,
  extractFactualClaimsTool,
  factCheckerTool,
  checkMathWithMathJsTool,
  checkMathTool,
  checkMathHybridTool,
  extractMathExpressionsTool,
  extractForecastingClaimsTool,
  documentChunkerTool,
  fuzzyTextLocatorTool,
  detectLanguageConventionTool,
  forecasterTool,
  linkValidator,
  perplexityResearchTool,
  claimEvaluatorTool,
  fallacyReviewTool,
  fallacyExtractorTool,
] as const;

/**
 * All tools mapped by their ID
 * The ID is derived from each tool's config.id (no hardcoding!)
 */
export const allTools = Object.fromEntries(
  toolsList.map(tool => [tool.config.id, tool])
) as Record<string, Tool>;

export type ToolId = keyof typeof allTools;

/**
 * Get the API path for a tool based on its ID
 * Uses the tool's config.path for consistency
 */
export function getToolPath(toolId: ToolId): string {
  const tool = allTools[toolId];
  return tool.config.path || `/api/tools/${toolId}`;
}

/**
 * Get a tool by its ID
 */
export function getToolById(toolId: ToolId) {
  return allTools[toolId];
}

// Re-export all tools for backward compatibility
export {
  checkSpellingGrammarTool,
  extractFactualClaimsTool,
  factCheckerTool,
  checkMathWithMathJsTool,
  checkMathTool,
  checkMathHybridTool,
  extractMathExpressionsTool,
  extractForecastingClaimsTool,
  documentChunkerTool,
  fuzzyTextLocatorTool,
  detectLanguageConventionTool,
  forecasterTool,
  linkValidator,
  perplexityResearchTool,
  claimEvaluatorTool,
  fallacyReviewTool,
  fallacyExtractorTool,
};