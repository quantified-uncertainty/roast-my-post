/**
 * Central registry of all available tools
 * This is the single source of truth for tool imports
 */

import checkSpellingGrammarTool from './check-spelling-grammar';
import extractFactualClaimsTool from './extract-factual-claims';
import factCheckerTool from './fact-checker';
import checkMathWithMathJsTool from './check-math-with-mathjs';
import checkMathTool from './check-math';
import checkMathHybridTool from './check-math-hybrid';
import extractMathExpressionsTool from './extract-math-expressions';
import extractForecastingClaimsTool from './extract-forecasting-claims';
import documentChunkerTool from './document-chunker';
import fuzzyTextLocatorTool from './fuzzy-text-locator';
import { detectLanguageConventionTool } from './detect-language-convention';
import forecasterTool from './forecaster';
import { linkValidator } from './link-validator';
import perplexityResearchTool from './perplexity-research';

/**
 * All tools mapped by their ID
 * The ID is derived from the tool's config.id
 */
export const allTools = {
  'check-spelling-grammar': checkSpellingGrammarTool,
  'extract-factual-claims': extractFactualClaimsTool,
  'fact-checker': factCheckerTool,
  'check-math-with-mathjs': checkMathWithMathJsTool,
  'check-math': checkMathTool,
  'check-math-hybrid': checkMathHybridTool,
  'extract-math-expressions': extractMathExpressionsTool,
  'extract-forecasting-claims': extractForecastingClaimsTool,
  'document-chunker': documentChunkerTool,
  'fuzzy-text-locator': fuzzyTextLocatorTool,
  'detect-language-convention': detectLanguageConventionTool,
  'forecaster': forecasterTool,
  'link-validator': linkValidator,
  'perplexity-research': perplexityResearchTool,
} as const;

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
};