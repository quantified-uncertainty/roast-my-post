# Hybrid Mathematical Checker

Simple wrapper: try MathJS first, then LLM as fallback

## Tools Used

- **[Check Math with MathJS](/tools/check-math-with-mathjs)** - Verify mathematical statements using an agentic approach with Claude and MathJS
- **[Check Mathematical Accuracy](/tools/check-math)** - Analyze text for mathematical errors including calculations, logic, units, and notation using Claude

## How It Works

Attempts numerical verification using MathJS Agent first (fast, accurate for numerical calculations). If MathJS returns `cannot_verify` (e.g., for symbolic math like derivatives), falls back to pure Claude analysis for conceptual mathematics.

## Capabilities & Limitations

**Strengths:** Best of both worlds - numerical accuracy from MathJS, conceptual reasoning from Claude. Handles arithmetic, algebra, unit conversions, calculus, and proofs. Smart early detection of symbolic statements to save costs.

**Limitations:** Cannot perform real-time symbolic algebra or step-by-step equation solving. MathJS requires numerical values - can't simplify "x + x = 2x" symbolically. Uses claude-sonnet-4-5 model.

## Technical Details

- Two-stage verification: MathJS Agent → LLM Fallback (if needed)
- Uses claude-sonnet-4-5 model for both stages
- 60-second timeout protection
- Returns which tool verified (mathjs/llm) with explanation and optional corrections
- Location: Implementation in `/internal-packages/ai/src/tools/check-math-hybrid/`
