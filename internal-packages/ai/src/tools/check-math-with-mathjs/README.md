# Check Math with MathJS

An agentic mathematical verification tool that gives Claude access to MathJS for computational verification. Claude acts as an agent that can make multiple calculation attempts using MathJS tools before providing a verdict.

## How It Works

Claude receives the mathematical statement and has access to two tools: `evaluate_expression` (for MathJS calculations) and `provide_verdict` (for final judgment). Claude can call evaluate_expression multiple times to break down complex expressions, then provides a structured verdict with status, explanation, and computation details.

## Capabilities & Limitations

**Strengths:** Handles numerical computations, unit conversions, comparisons, and mathematical functions through MathJS. Can make multiple calculation attempts to verify different parts of a statement. Early detection of symbolic math to avoid unnecessary API calls.

**Limitations:** Cannot handle symbolic mathematics (derivatives, integrals, proofs). Limited to 5 rounds of tool calls with 60-second timeout. Returns `cannot_verify` for symbolic expressions or incomplete statements. Costs ~$0.02-0.05 per verification due to multiple Claude tool calls.

## Technical Details

- **Agent approach:** Claude with tool access, not direct MathJS evaluation
- **Cost optimization:** Early return for symbolic/incomplete expressions
- **Session tracking:** Integrated with Helicone for usage monitoring
- **Location:** Implementation in `/internal-packages/ai/src/tools/check-math-with-mathjs/`