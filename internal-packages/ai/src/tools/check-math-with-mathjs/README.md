# Check Math with MathJS

Verify mathematical statements using an agentic approach with Claude and MathJS

## How It Works

The tool uses a mathematical calculator ([MathJS](https://mathjs.org/)) to verify numerical statements and calculations. It can handle arithmetic, algebra, trigonometry, unit conversions, and more.

## Capabilities & Limitations

**Strengths:** 
- Accurate numerical calculations using MathJS calculator
- Handles unit conversions, trigonometry, logarithms, and complex expressions
- Smart approximation detection - accepts reasonable rounding
- Consistent results - same input always gives same answer
- Can verify multi-step calculations and word problems

**Limitations:**
- Cannot handle symbolic mathematics (derivatives, integrals, proofs)
- Limited to numerical computations and basic algebra
- Uses claude-sonnet-4-5 model for agent mode
- May timeout on very complex calculations (60-second limit)

## Two-Mode Design

The tool intelligently chooses between two approaches:

**Direct Mode (Fast & Free):** For simple equality statements like "2 + 2 = 4", the tool calculates directly using MathJS without needing Claude. This is instant and costs nothing.

**Agent Mode (Smart & Flexible):** For complex statements, word problems, or multi-step calculations, Claude gets access to two tools:
- `evaluate_expression` - Uses MathJS to calculate any mathematical expression
- `provide_verdict` - Gives the final true/false judgment with explanation

This hybrid approach gives you the speed of direct calculation for simple cases while providing the reasoning power of Claude for complex problems.

## Smart Approximation Handling

The tool intelligently handles mathematical approximations based on the precision you show:

**Examples of what gets accepted:**
- "10/3 = 3.33" ✅ (3.333... rounds to 3.33)
- "π = 3.14" ✅ (3.14159... rounds to 3.14) 
- "√2 = 1.414" ✅ (1.41421... rounds to 1.414)

**Examples of what gets rejected:**
- "π = 3.0" ❌ (3.14159... rounds to 3.1, not 3.0)
- "10/3 = 3.0" ❌ (3.333... rounds to 3.3, not 3.0)

## Technical Details

- Two-mode operation: Direct (simple equality) vs Agent (complex statements)
- Uses claude-sonnet-4-5 model for agent mode
- MathJS calculator for numerical computations
- Smart approximation handling based on precision shown
- Timeout: 60 seconds for complex calculations
- Location: Implementation in `/internal-packages/ai/src/tools/check-math-with-mathjs/`
