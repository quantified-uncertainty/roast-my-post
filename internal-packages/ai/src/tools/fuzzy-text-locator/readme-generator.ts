/**
 * Programmatic README generator for Fuzzy Text Locator Tool
 */

import {
  generateToolHeader,
  generateToolsUsedSection,
  getToolDependencies,
} from "../utils/readme-helpers";
import fuzzyTextLocatorTool from "./index";

export function generateReadme(): string {
  const dependencies = getToolDependencies(fuzzyTextLocatorTool);
  const header = generateToolHeader(fuzzyTextLocatorTool);
  const toolsSection = generateToolsUsedSection(dependencies);

  return `${header}

${toolsSection}## How It Works

Uses cascading search strategies to find text within documents, trying faster methods first (exact match, quote normalization) before falling back to slower methods (fuzzy matching, LLM semantic search). Each match returns exact character positions with confidence scores (0.0-1.0).

## Limitations

Performance decreases with document size. LLM fallback requires API access and adds 500-2000ms. Cannot handle severe paraphrasing without LLM fallback enabled.

## Technical Details

- Strategy cascade: exact → quote-normalized → (partial | fuzzy | markdown-aware) → LLM
- Confidence scoring: 0.0-1.0 scale
- Configuration options: normalizeQuotes, partialMatch, maxTypos, useLLMFallback
- Primary use case: Precise text positioning for analysis plugin annotations
`;
}
