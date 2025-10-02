/**
 * Programmatic README generator for Extract Factual Claims Tool
 */

import {
  generateToolHeader,
  generateToolsUsedSection,
} from "../utils/readme-helpers";
import { extractFactualClaimsTool } from "./index";

export function generateReadme(): string {
  const dependencies = extractFactualClaimsTool.getToolDependencies?.() ?? [];
  const header = generateToolHeader(extractFactualClaimsTool);
  const toolsSection = generateToolsUsedSection(dependencies);

  return `${header}

${toolsSection}## How It Works

Analyzes text to identify factual statements, then scores each claim across three dimensions: importance (how central to the argument), checkability (how easily fact-checked), and truth probability (estimated likelihood of being true). Assigns topic categories and confidence scores for each extraction.

## Limitations

May occasionally extract opinions as factual claims. Can miss context-dependent or implicit claims. Performance varies by domain and document structure.

## Integration

Works well with:
- **Fact Checker Tool**: Verify extracted claims for accuracy
- **Perplexity Research Tool**: Find sources for claim verification

## Technical Details

- Extracts multiple claims in single operation
- Scoring dimensions: importance, checkability, truth probability (0-100 each)
- Topic categorization (economics, history, science, etc.)
- Uses fuzzy-text-locator for precise text positioning
`;
}
