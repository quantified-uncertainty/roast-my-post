/**
 * Programmatic README generator for Check Math Hybrid Tool
 */

import {
  generateToolHeader,
  generateToolsUsedSection,
} from "../utils/readme-helpers";
import { checkMathHybridTool } from "./index";
import { MODEL_CONFIG } from "../../claude/wrapper";

export function generateReadme(): string {
  const dependencies = checkMathHybridTool.getToolDependencies?.() ?? [];
  const header = generateToolHeader(checkMathHybridTool);
  const toolsSection = generateToolsUsedSection(dependencies);

  return `${header}

${toolsSection}## How It Works

Attempts numerical verification using MathJS Agent first (fast, accurate for numerical calculations). If MathJS returns \`cannot_verify\` (e.g., for symbolic math like derivatives), falls back to pure Claude analysis for conceptual mathematics.

## Capabilities & Limitations

**Strengths:** Best of both worlds - numerical accuracy from MathJS, conceptual reasoning from Claude. Handles arithmetic, algebra, unit conversions, calculus, and proofs. Smart early detection of symbolic statements to save costs.

**Limitations:** Cannot perform real-time symbolic algebra or step-by-step equation solving. MathJS requires numerical values - can't simplify "x + x = 2x" symbolically. Uses ${MODEL_CONFIG.analysis} model.

## Technical Details

- Two-stage verification: MathJS Agent → LLM Fallback (if needed)
- Uses ${MODEL_CONFIG.analysis} model for both stages
- 60-second timeout protection
- Returns which tool verified (mathjs/llm) with explanation and optional corrections
- Location: Implementation in \`/internal-packages/ai/src/tools/check-math-hybrid/\`
`;
}
