// Tool configurations for client-side use (no implementations)
// These can be safely imported in browser code
// This is the single source of truth for tool metadata
import type { ToolConfig } from './base/Tool';

// ============================================================================
// Tool Configs - Single Source of Truth
// ============================================================================

export const checkMathConfig: ToolConfig = {
  id: 'math-validator-llm',
  name: 'Math Validator (LLM)',
  description: 'Analyze text for mathematical errors including calculations, logic, units, and notation using Claude',
  version: '1.0.0',
  category: 'checker',
  costEstimate: '~$0.02 per check (1 Claude call with longer analysis)',
  path: '/tools/math-validator-llm',
  status: 'stable'
};

export const checkMathWithMathJsConfig: ToolConfig = {
  id: 'math-validator-mathjs',
  name: 'Math Validator (MathJS)',
  description: 'Verify mathematical statements using an agentic approach with Claude and MathJS',
  version: '2.0.0',
  category: 'checker',
  costEstimate: '~$0.02-0.05 per statement (uses Claude with multiple tool calls)',
  path: '/tools/math-validator-mathjs',
  status: 'beta'
};

export const checkMathHybridConfig: ToolConfig = {
  id: 'math-validator-hybrid',
  name: 'Math Validator (Hybrid)',
  description: 'Simple wrapper: try MathJS first, then LLM as fallback',
  version: '1.0.0',
  category: 'checker',
  costEstimate: '~$0.01-0.03 per check (computational + optional LLM)',
  path: '/tools/math-validator-hybrid',
  status: 'stable'
};

export const factCheckerConfig: ToolConfig = {
  id: 'fact-checker',
  name: 'Fact Checker',
  description: 'Verify the accuracy of specific factual claims',
  version: '1.0.0',
  category: 'checker',
  costEstimate: '~$0.01-0.02 per claim',
  path: '/tools/fact-checker',
  status: 'stable'
};

export const forecasterConfig: ToolConfig = {
  id: 'binary-forecaster',
  name: 'Binary Forecaster',
  description: 'Generate probability forecasts using multiple independent Claude analyses',
  version: '1.0.0',
  category: 'research',
  costEstimate: '~$0.05 per forecast (6 Claude calls)',
  path: '/tools/binary-forecaster',
  status: 'experimental'
};

export const fuzzyTextLocatorConfig: ToolConfig = {
  id: 'smart-text-searcher',
  name: 'Smart Text Searcher',
  description: 'Find the location of text within documents using multiple search strategies including exact matching, fuzzy matching, quote normalization, partial matching, and LLM fallback for paraphrased or difficult-to-find text',
  version: '1.1.0',
  category: 'utility',
  costEstimate: 'Free (or minimal LLM cost if fallback is used)',
  path: '/tools/smart-text-searcher',
  status: 'stable'
};

export const documentChunkerConfig: ToolConfig = {
  id: 'document-chunker',
  name: 'Document Chunker',
  description: 'Splits documents into semantic chunks optimized for LLM analysis. Supports multiple strategies including markdown-aware, semantic, and hybrid chunking.',
  version: '1.0.0',
  category: 'utility',
  costEstimate: '$0 (no LLM calls)',
  path: '/tools/document-chunker',
  status: 'stable'
};

export const extractForecastingClaimsConfig: ToolConfig = {
  id: 'binary-forecasting-claims-extractor',
  name: 'Binary Forecasting Claims Extractor',
  description: 'Extracts predictions and converts them to binary (YES/NO) questions. Scores on three dimensions: precision (how binary/specific), verifiability (can we check with public data), and importance (centrality to argument)',
  version: '2.0.0',
  category: 'extraction',
  costEstimate: '~$0.01-0.03 per analysis (uses Claude Sonnet)',
  path: '/tools/binary-forecasting-claims-extractor',
  status: 'beta'
};

export const extractFactualClaimsConfig: ToolConfig = {
  id: 'factual-claims-extractor',
  name: 'Factual Claims Extractor',
  description: 'Extract and score verifiable factual claims from text',
  version: '2.0.0',
  category: 'extraction',
  costEstimate: '~$0.01-0.03 per analysis (depends on text length)',
  path: '/tools/factual-claims-extractor',
  status: 'stable'
};

export const checkSpellingGrammarConfig: ToolConfig = {
  id: 'spelling-grammar-checker',
  name: 'Spelling & Grammar Checker',
  description: 'Analyze text for spelling and grammar errors using Claude with advanced error detection',
  version: '2.0.0',
  category: 'checker',
  costEstimate: '~$0.01-0.02 per check',
  path: '/tools/spelling-grammar-checker',
  status: 'stable'
};

export const extractMathExpressionsConfig: ToolConfig = {
  id: 'math-expressions-extractor',
  name: 'Math Expressions Extractor',
  description: 'Extract and analyze mathematical expressions from text, including error detection and complexity assessment',
  version: '1.0.0',
  category: 'extraction',
  costEstimate: '~$0.02 per extraction (1 Claude call)',
  path: '/tools/math-expressions-extractor',
  status: 'beta'
};

export const detectLanguageConventionConfig: ToolConfig = {
  id: 'language-convention-detector',
  name: 'English Dialect Detector',
  description: 'Detect whether text uses US or UK English conventions',
  version: '1.0.0',
  category: 'checker',
  costEstimate: '~$0.00 (no LLM calls)',
  path: '/tools/language-convention-detector',
  status: 'stable'
};

export const perplexityResearchConfig: ToolConfig = {
  id: 'perplexity-researcher',
  name: 'Perplexity Researcher',
  description: 'Web-enhanced research using Perplexity Sonar models via OpenRouter',
  version: '1.0.0',
  category: 'research',
  costEstimate: '~$0.001-0.005 per query (via OpenRouter)',
  path: '/tools/perplexity-researcher',
  status: 'stable'
};

export const linkValidatorConfig: ToolConfig = {
  id: 'link-validator',
  name: 'Link Validator',
  description: 'Extracts and validates all URLs from a text, checking their accessibility and returning detailed validation results',
  version: '1.0.0',
  category: 'checker',
  costEstimate: 'Free (no LLM usage)',
  path: '/tools/link-validator',
  status: 'stable'
};

// ============================================================================
// Legacy Exports (for backward compatibility)
// ============================================================================

export const checkMathTool = { config: checkMathConfig };
export const checkMathWithMathJsTool = { config: checkMathWithMathJsConfig };
export const checkMathHybridTool = { config: checkMathHybridConfig };
export const factCheckerTool = { config: factCheckerConfig };
export const forecasterTool = { config: forecasterConfig };
export const fuzzyTextLocatorTool = { config: fuzzyTextLocatorConfig };
export const documentChunkerTool = { config: documentChunkerConfig };
export const extractForecastingClaimsTool = { config: extractForecastingClaimsConfig };
export const extractFactualClaimsTool = { config: extractFactualClaimsConfig };
export const checkSpellingGrammarTool = { config: checkSpellingGrammarConfig };
export const extractMathExpressionsTool = { config: extractMathExpressionsConfig };
export const detectLanguageConventionTool = { config: detectLanguageConventionConfig };
export const perplexityResearchTool = { config: perplexityResearchConfig };
export const linkValidatorTool = { config: linkValidatorConfig };

// ============================================================================
// Tool Metadata Registry
// ============================================================================

const toolMetadata = [
  checkMathConfig,
  checkMathWithMathJsConfig,
  checkMathHybridConfig,
  factCheckerConfig,
  forecasterConfig,
  fuzzyTextLocatorConfig,
  documentChunkerConfig,
  extractForecastingClaimsConfig,
  extractFactualClaimsConfig,
  checkSpellingGrammarConfig,
  extractMathExpressionsConfig,
  detectLanguageConventionConfig,
  perplexityResearchConfig,
  linkValidatorConfig,
];

// Tool registry for client-side use
export const toolRegistry = {
  [checkMathConfig.id]: checkMathTool,
  [checkMathWithMathJsConfig.id]: checkMathWithMathJsTool,
  [checkMathHybridConfig.id]: checkMathHybridTool,
  [factCheckerConfig.id]: factCheckerTool,
  [forecasterConfig.id]: forecasterTool,
  [fuzzyTextLocatorConfig.id]: fuzzyTextLocatorTool,
  [documentChunkerConfig.id]: documentChunkerTool,
  [extractForecastingClaimsConfig.id]: extractForecastingClaimsTool,
  [extractFactualClaimsConfig.id]: extractFactualClaimsTool,
  [checkSpellingGrammarConfig.id]: checkSpellingGrammarTool,
  [extractMathExpressionsConfig.id]: extractMathExpressionsTool,
  [detectLanguageConventionConfig.id]: detectLanguageConventionTool,
  [perplexityResearchConfig.id]: perplexityResearchTool,
  [linkValidatorConfig.id]: linkValidatorTool,

  // Method to get metadata for tools page
  getMetadata: () => toolMetadata,
};
