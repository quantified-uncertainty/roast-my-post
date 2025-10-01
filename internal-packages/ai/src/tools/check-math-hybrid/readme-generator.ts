/**
 * Programmatic README generator for Check Math Hybrid Tool
 */

import { checkMathHybridTool } from './index';
import { generateToolHeader, getToolDependencies, generateToolsUsedSection } from '../utils/readme-helpers';

export function generateReadme(): string {
  const dependencies = checkMathHybridTool.getToolDependencies();
  const header = generateToolHeader(checkMathHybridTool);
  const toolsSection = generateToolsUsedSection(dependencies);

  return `${header}

${toolsSection}## How It Works

The tool executes two verification strategies in sequence:
1. **MathJS Agent** - Uses Claude with MathJS tool access to attempt numerical verification. Claude can call MathJS multiple times to break down complex calculations.
2. **LLM Fallback** - If MathJS can't verify (returns \`cannot_verify\`), falls back to pure Claude analysis for conceptual/symbolic math like derivatives, limits, or proofs.

## Capabilities & Limitations

**Can verify:** Basic arithmetic, numerical expressions with functions (sqrt, factorial, log), unit conversions (via MathJS), and conceptual mathematics like calculus and proofs (via LLM fallback).

**Cannot handle:** Real-time symbolic algebra, step-by-step equation solving, or graphical representations. MathJS stage requires numerical values - it can't simplify "x + x = 2x" symbolically. The tool returns early for obviously symbolic statements (derivatives, integrals, limits) to save API costs.

## Technical Details

- **Cost:** ~$0.01-0.03 per verification (uses Claude Haiku for analysis)
- **Response time:** 2-5 seconds typically, with 60-second timeout protection
- **Output:** Returns which tool verified (mathjs/llm), explanation, and optional correction suggestions
- **Location:** Implementation in \`/internal-packages/ai/src/tools/check-math-hybrid/\`
`;
}
