// Tool configurations for client-side use (no implementations)
// These can be safely imported in browser code
// This is the single source of truth for tool metadata
import type { ToolConfig } from "./base/Tool";

// ============================================================================
// Tool Configs - Single Source of Truth
// ============================================================================

export const mathValidatorLLMConfig: ToolConfig = {
  id: "math-validator-llm",
  name: "Math Validator (LLM)",
  description:
    "Analyze text for mathematical errors including calculations, logic, units, and notation using Claude",
  version: "1.0.0",
  category: "checker",
  costEstimate: "~$0.02 per check (1 Claude call with longer analysis)",
  path: "/tools/math-validator-llm",
  status: "stable",
};

export const mathValidatorMathJsConfig: ToolConfig = {
  id: "math-validator-mathjs",
  name: "Math Validator (MathJS)",
  description:
    "Verify mathematical statements using an agentic approach with Claude and MathJS",
  version: "2.0.0",
  category: "checker",
  costEstimate:
    "~$0.02-0.05 per statement (uses Claude with multiple tool calls)",
  path: "/tools/math-validator-mathjs",
  status: "beta",
};

export const mathValidatorHybridConfig: ToolConfig = {
  id: "math-validator-hybrid",
  name: "Math Validator (Hybrid)",
  description: "Simple wrapper: try MathJS first, then LLM as fallback",
  version: "1.0.0",
  category: "checker",
  costEstimate: "~$0.01-0.03 per check (computational + optional LLM)",
  path: "/tools/math-validator-hybrid",
  status: "stable",
};

export const factCheckerConfig: ToolConfig = {
  id: "fact-checker",
  name: "Fact Checker",
  description: "Verify the accuracy of specific factual claims",
  version: "1.0.0",
  category: "checker",
  costEstimate: "~$0.01-0.02 per claim",
  path: "/tools/fact-checker",
  status: "stable",
};

export const binaryForecasterConfig: ToolConfig = {
  id: "binary-forecaster",
  name: "Binary Forecaster",
  description:
    "Generate probability forecasts using multiple independent Claude analyses",
  version: "1.0.0",
  category: "research",
  costEstimate: "~$0.05 per forecast (6 Claude calls)",
  path: "/tools/binary-forecaster",
  status: "experimental",
};

export const fuzzyTextSearcherConfig: ToolConfig = {
  id: "smart-text-searcher",
  name: "Smart Text Searcher",
  description:
    "Find the location of text within documents using multiple search strategies including exact matching, fuzzy matching, quote normalization, partial matching, and LLM fallback for paraphrased or difficult-to-find text",
  version: "1.1.0",
  category: "utility",
  costEstimate: "Free (or minimal LLM cost if fallback is used)",
  path: "/tools/smart-text-searcher",
  status: "stable",
};

export const documentChunkerConfig: ToolConfig = {
  id: "document-chunker",
  name: "Document Chunker",
  description:
    "Splits documents into semantic chunks optimized for LLM analysis. Supports multiple strategies including markdown-aware, semantic, and hybrid chunking.",
  version: "1.0.0",
  category: "utility",
  costEstimate: "$0 (no LLM calls)",
  path: "/tools/document-chunker",
  status: "stable",
};

export const binaryForecastingClaimsExtractorConfig: ToolConfig = {
  id: "binary-forecasting-claims-extractor",
  name: "Binary Forecasting Claims Extractor",
  description:
    "Extracts predictions and converts them to binary (YES/NO) questions. Scores on four dimensions: precision (how binary/specific), verifiability (can we check with public data), importance (centrality to argument), and robustness (how well-supported)",
  version: "2.0.0",
  category: "extraction",
  costEstimate: "~$0.01-0.03 per analysis (uses Claude Sonnet)",
  path: "/tools/binary-forecasting-claims-extractor",
  status: "beta",
};

export const factualClaimsExtractorConfig: ToolConfig = {
  id: "factual-claims-extractor",
  name: "Factual Claims Extractor",
  description: "Extract and score verifiable factual claims from text",
  version: "2.0.0",
  category: "extraction",
  costEstimate: "~$0.01-0.03 per analysis (depends on text length)",
  path: "/tools/factual-claims-extractor",
  status: "stable",
};

export const spellingGrammarCheckerConfig: ToolConfig = {
  id: "spelling-grammar-checker",
  name: "Spelling & Grammar Checker",
  description:
    "Analyze text for spelling and grammar errors using Claude with advanced error detection",
  version: "2.0.0",
  category: "checker",
  costEstimate: "~$0.01-0.02 per check",
  path: "/tools/spelling-grammar-checker",
  status: "stable",
};

export const mathExpressionsExtractorConfig: ToolConfig = {
  id: "math-expressions-extractor",
  name: "Math Expressions Extractor",
  description:
    "Extract and analyze mathematical expressions from text, including error detection and complexity assessment",
  version: "1.0.0",
  category: "extraction",
  costEstimate: "~$0.02 per extraction (1 Claude call)",
  path: "/tools/math-expressions-extractor",
  status: "beta",
};

export const languageConventionDetectorConfig: ToolConfig = {
  id: "language-convention-detector",
  name: "English Dialect Detector",
  description: "Detect whether text uses US or UK English conventions",
  version: "1.0.0",
  category: "checker",
  costEstimate: "~$0.00 (no LLM calls)",
  path: "/tools/language-convention-detector",
  status: "stable",
};

export const perplexityResearcherConfig: ToolConfig = {
  id: "perplexity-researcher",
  name: "Perplexity Researcher",
  description:
    "Web-enhanced research using Perplexity Sonar models via OpenRouter",
  version: "1.0.0",
  category: "research",
  costEstimate: "~$0.001-0.005 per query (via OpenRouter)",
  path: "/tools/perplexity-researcher",
  status: "stable",
};

export const linkValidatorConfig: ToolConfig = {
  id: "link-validator",
  name: "Link Validator",
  description:
    "Extracts and validates all URLs from a text, checking their accessibility and returning detailed validation results",
  version: "1.0.0",
  category: "checker",
  costEstimate: "Free (no LLM usage)",
  path: "/tools/link-validator",
  status: "stable",
};

export const claimEvaluatorConfig: ToolConfig = {
  id: "claim-evaluator",
  name: "Claim Evaluator",
  description:
    "Evaluate claims by polling multiple LLM models in parallel (Claude, GPT, Grok) via OpenRouter. Each model provides an agreement score (0-100), brief reasoning, and response time in milliseconds.",
  version: "1.0.0",
  category: "research",
  costEstimate: "~$0.01-0.05 per claim (4+ model calls via OpenRouter)",
  path: "/tools/claim-evaluator",
  status: "experimental",
};

export const epistemicIssuesExtractorConfig: ToolConfig = {
  id: "epistemic-issues-extractor",
  name: "Epistemic Issues Extractor",
  description:
    "Extract and score potential misinformation, missing context, deceptive wording, and logical fallacies from text",
  version: "1.0.0",
  category: "extraction",
  costEstimate: "~$0.01-0.03 per analysis (uses Claude Sonnet)",
  path: "/tools/epistemic-issues-extractor",
  status: "beta",
};

export const epistemicReviewConfig: ToolConfig = {
  id: "epistemic-review",
  name: "Epistemic Review",
  description:
    "Reviews and filters epistemic critic comments, removing redundant issues and generating comprehensive document summaries",
  version: "1.0.0",
  category: "utility",
  path: "/tools/epistemic-review",
  status: "beta",
};

// ============================================================================
// Tool Configs List (for client-side metadata)
// ============================================================================

export const allToolConfigs = [
  mathValidatorLLMConfig,
  mathValidatorMathJsConfig,
  mathValidatorHybridConfig,
  factCheckerConfig,
  binaryForecasterConfig,
  fuzzyTextSearcherConfig,
  documentChunkerConfig,
  binaryForecastingClaimsExtractorConfig,
  factualClaimsExtractorConfig,
  spellingGrammarCheckerConfig,
  mathExpressionsExtractorConfig,
  languageConventionDetectorConfig,
  perplexityResearcherConfig,
  linkValidatorConfig,
  claimEvaluatorConfig,
  epistemicIssuesExtractorConfig,
  epistemicReviewConfig,
];

// ============================================================================
// Tool Registry (client-safe config lookup)
// ============================================================================

export const toolRegistry = Object.fromEntries(
  allToolConfigs.map((config) => [config.id, config])
) as Record<string, ToolConfig>;
