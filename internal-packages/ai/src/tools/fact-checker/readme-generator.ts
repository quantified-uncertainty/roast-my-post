/**
 * Programmatic README generator for Fact Checker Tool
 */

import {
  generateToolHeader,
  generateToolsUsedSection,
} from "../utils/readme-helpers";
import { factCheckerTool } from "./index";

export function generateReadme(): string {
  const dependencies = factCheckerTool.getToolDependencies?.() ?? [];
  const header = generateToolHeader(factCheckerTool);
  const toolsSection = generateToolsUsedSection(dependencies);

  return `${header}

${toolsSection}## How It Works

Uses Perplexity Research to gather current information and sources, then analyzes specific claims for accuracy and truthfulness. Returns structured verdicts (true, false, partially-true, unverifiable, or outdated) with detailed reasoning and supporting evidence.

## Limitations

Effectiveness depends on claim specificity and available evidence sources. Cannot verify highly specialized or very recent claims.

## Integration

Works with **Extract Factual Claims** tool:
1. Extract claims from documents
2. Prioritize high-importance claims
3. Verify selected claims for accuracy
4. Generate comprehensive fact-check reports

## Technical Details

- Uses Perplexity Research tool for web-enhanced information gathering
- Provides structured verdict types: true, false, partially-true, unverifiable, outdated
- Includes confidence scoring and correction suggestions
- Best used for high-priority or controversial claims
`;
}
