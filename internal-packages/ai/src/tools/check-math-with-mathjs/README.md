# Check Math with MathJS

An agentic mathematical verification tool that gives Claude access to MathJS for computational verification. Claude acts as an agent that can make multiple calculation attempts using MathJS tools before providing a verdict. The tool now features **deterministic numeric comparison** at the code level for consistent approximation handling.

## How It Works

The tool operates in two modes:

1. **Direct Evaluation Mode:** For simple equality statements (e.g., "2 + 2 = 4"), the tool attempts direct MathJS evaluation with deterministic comparison logic
2. **Agent Mode:** For complex statements, Claude receives access to two tools: `evaluate_expression` (for MathJS calculations) and `provide_verdict` (for final judgment)

## Deterministic Numeric Comparison

The tool now includes code-level deterministic comparison logic that automatically handles mathematical approximations:

### Approximation Rules
- **Precision-based rounding:** Values are compared based on the decimal precision shown in the statement
- **Automatic acceptance:** Reasonable approximations are accepted without LLM interpretation
  - ✅ "10/3 = 3.33" → Accepted (3.333... rounds to 3.33)
  - ✅ "π = 3.14" → Accepted (3.14159... rounds to 3.14)
  - ✅ "√2 = 1.414" → Accepted (1.41421... rounds to 1.414)
  - ❌ "π = 3.0" → Rejected (3.14159... rounds to 3.1, not 3.0)
  - ❌ "10/3 = 3.0" → Rejected (3.333... rounds to 3.3, not 3.0)

### Comparison Options
- **Absolute tolerance:** 1e-10 for very small differences
- **Relative tolerance:** Optional for percentage-based comparisons
- **Special values:** Handles Infinity, NaN, and -0 correctly

## Capabilities & Limitations

**Strengths:** 
- Handles numerical computations, unit conversions, comparisons, and mathematical functions through MathJS
- Deterministic approximation handling without relying on LLM interpretation
- Can make multiple calculation attempts to verify different parts of a statement
- Early detection of symbolic math to avoid unnecessary API calls
- Consistent and predictable comparison behavior

**Limitations:** 
- Cannot handle symbolic mathematics (derivatives, integrals, proofs)
- Limited to 5 rounds of tool calls with 60-second timeout
- Returns `cannot_verify` for symbolic expressions or incomplete statements
- Costs ~$0.02-0.05 per verification when using agent mode

## Technical Architecture

### Core Components

1. **`numeric-comparison.ts`** - Deterministic comparison utilities
   - `compareNumericValues()` - Main comparison function with approximation logic
   - `countDecimalPlaces()` - Determines precision from stated values
   - `roundToDecimalPlaces()` - Rounds computed values for fair comparison
   - `parseEqualityStatement()` - Parses various equality operators

2. **`index.ts`** - Main tool implementation
   - `tryDirectEvaluation()` - Attempts direct MathJS evaluation
   - `tryEvaluateEquality()` - Handles equality comparisons with deterministic logic
   - `evaluateExpression()` - Tool for Claude to evaluate expressions
   - `llmAssistedVerification()` - Falls back to LLM for complex cases

### Implementation Details

- **Agent approach:** Claude with tool access for complex expressions
- **Direct evaluation:** Bypasses LLM for simple equality checks
- **Cost optimization:** Early return for symbolic/incomplete expressions
- **Session tracking:** Integrated with Helicone for usage monitoring
- **Location:** Implementation in `/internal-packages/ai/src/tools/check-math-with-mathjs/`

## Testing

The tool includes comprehensive test coverage:
- **Unit tests:** `numeric-comparison.test.ts` - Tests comparison logic
- **Integration tests:** `deterministic-comparison.integration.test.ts` - Tests with real MathJS evaluations
- **E2E tests:** `check-math-with-mathjs.e2e.test.ts` - Full tool testing with Claude API