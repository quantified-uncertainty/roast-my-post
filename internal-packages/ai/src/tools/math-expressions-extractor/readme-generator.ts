/**
 * Programmatic README generator for Extract Math Expressions Tool
 */

import {
  generateToolHeader,
  generateToolsUsedSection,
  getToolDependencies,
} from "../utils/readme-helpers";
import {
  ERROR_LIKELIHOOD_THRESHOLD,
  extractMathExpressionsTool,
} from "./index";

export function generateReadme(): string {
  const dependencies = getToolDependencies(extractMathExpressionsTool);
  const header = generateToolHeader(extractMathExpressionsTool);
  const toolsSection = generateToolsUsedSection(dependencies);

  return `${header}

${toolsSection}## How It Works

Uses Claude to identify mathematical expressions that appear potentially incorrect, focusing on arithmetic errors, wrong calculations, and unit conversion mistakes. Deliberately filters out correct expressions and factual/forecasting claims handled by other tools. Returns expressions with error likelihood scores and surrounding context.

**Limitations:** Intentionally restrictive - won't extract correct math or simple expressions. Cannot verify correctness itself (use math checker tools for that). May miss subtle errors in complex formulas.

## Technical Details

- Extraction threshold: Only expressions with \`${ERROR_LIKELIHOOD_THRESHOLD}%\`+ error likelihood
- Exclusions: Correct math, simple percentages, factual claims, predictions
- Output: Expression text, error likelihood, context, character offsets
- Uses Claude to identify potentially incorrect expressions
`;
}
