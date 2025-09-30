/**
 * Programmatic README generator for Extract Math Expressions Tool
 */

import { extractMathExpressionsTool } from './index';
import { generateToolHeader, getToolDependencies, generateToolsUsedSection } from '../utils/readme-helpers';

export function generateReadme(): string {
  const dependencies = getToolDependencies(extractMathExpressionsTool);
  const header = generateToolHeader(extractMathExpressionsTool);
  const toolsSection = generateToolsUsedSection(dependencies);

  return `${header}

${toolsSection}## How It Works

Uses Claude to identify mathematical expressions that appear incorrect, focusing on arithmetic errors, wrong calculations, and unit conversion mistakes. Deliberately filters out correct expressions, simple percentages, and factual/forecasting claims handled by other tools. Returns expressions with error likelihood scores and surrounding context.

## Capabilities & Limitations

**Strengths:** Focused extraction - only flags likely errors to reduce noise. Avoids overlap with fact-checking and forecasting tools. Includes context and character offsets for each expression. Estimates error likelihood (0-100) for prioritization.

**Limitations:** Intentionally restrictive - won't extract correct math or simple expressions. Cannot verify correctness itself (use math checker tools for that). May miss subtle errors in complex formulas. Costs ~$0.02 per extraction.

## Technical Details

- **Extraction threshold:** Only expressions with 20%+ error likelihood
- **Exclusions:** Correct math, simple percentages, factual claims, predictions
- **Output:** Expression text, error likelihood, context, character offsets
- **Temperature:** 0 for consistent extraction
- **Location:** Implementation in \`/internal-packages/ai/src/tools/extract-math-expressions/\`
`;
}
