# Check Math with MathJS - Architecture Documentation

## Overview

This tool verifies mathematical statements using a multi-layered approach that combines MathJS parsing, deterministic numeric comparison, and Claude's LLM capabilities as a fallback. The architecture prioritizes deterministic, code-level verification over LLM interpretation whenever possible.

## Core Architecture

```
Input Statement (e.g., "10/3 = 3.33")
    ↓
[Format & Parse Layer]
    ├─→ formatForMathJS() - Convert symbols (π→pi, ×→*, =→==)
    └─→ parseMathExpression() - Parse to AST using MathJS
    ↓
[Evaluation Strategy Layer]
    ├─→ tryDirectEvaluation() - Simple equalities
    ├─→ tryEvaluateEquality() - Complex equalities  
    └─→ llmAssistedVerification() - Fallback for complex cases
    ↓
[Comparison Layer]
    └─→ compareNumericValues() - Deterministic comparison with precision rules
    ↓
Output (verified_true/verified_false/cannot_verify)
```

## Key Components

### 1. Parser Layer (`mathjs-parser-utils.ts`)

**Purpose**: Use MathJS's Abstract Syntax Tree (AST) parser instead of string manipulation to understand mathematical expressions.

**Key Functions**:
- `parseMathExpression()`: Parses expression into AST, identifies if it's an equality
- `formatForMathJS()`: Normalizes mathematical symbols for MathJS compatibility
- `evaluateEquality()`: Evaluates both sides of an equality separately

**Why AST over String Parsing**:
```typescript
// OLD WAY (fragile string parsing):
const parts = statement.split('=');  // What if there are multiple =?
const left = parts[0];  // Hope this is right...

// NEW WAY (robust AST parsing):
const node = parse("2 + 2 == 4");
// Returns: OperatorNode {
//   fn: "equal",
//   args: [
//     OperatorNode { fn: "add", args: [2, 2] },  // Left side
//     ConstantNode { value: 4 }                   // Right side
//   ]
// }
```

### 2. Numeric Comparison Layer (`numeric-comparison.ts`)

**Purpose**: Provide deterministic, code-level comparison logic that handles approximations consistently.

**Key Functions**:
- `compareNumericValues()`: Main comparison with approximation rules
- `countDecimalPlaces()`: Determines precision from stated values
- `roundToDecimalPlaces()`: Rounds computed values for fair comparison

**Approximation Algorithm**:
1. Count decimal places in the stated value (e.g., "3.33" has 2 decimals)
2. Round the computed value to the same precision
3. Compare the rounded values
4. Accept if they match, reject otherwise

**Examples**:
- "10/3 = 3.33" → 3.333... rounds to 3.33 → ✅ Accept
- "π = 3.14" → 3.14159... rounds to 3.14 → ✅ Accept  
- "π = 3.0" → 3.14159... rounds to 3.1 → ❌ Reject

### 3. Evaluation Flow (`index.ts`)

The tool uses a cascading evaluation strategy:

#### Direct Evaluation Path
```typescript
tryDirectEvaluation() {
  // 1. Format expression for MathJS
  const formatted = formatForMathJS("10/3 = 3.33");  // "10/3 == 3.33"
  
  // 2. Parse and check if it's an equality
  const equality = parseEqualityStatement(formatted);
  if (!equality.isEquality) return null;
  
  // 3. Evaluate both sides
  leftValue = 3.333...
  rightValue = 3.33
  
  // 4. Compare with approximation rules
  const comparison = compareNumericValues("3.33", 3.333...);
  // Returns: { isEqual: true, reason: "Reasonable approximation (2 decimals)" }
  
  // 5. Return result without using LLM
  return { status: 'verified_true', ... }
}
```

#### Tool-based Evaluation Path
```typescript
tryEvaluateEquality() {
  // Similar to direct evaluation but works within the tool context
  // Used when evaluateExpression() is called by Claude
}
```

#### LLM Fallback Path
```typescript
llmAssistedVerification() {
  // Only used when:
  // - Expression is not a simple equality
  // - Contains symbolic math
  // - Requires complex reasoning
  // Claude acts as an agent with access to MathJS tools
}
```

## Data Flow Example

Let's trace through "10/3 = 3.33":

1. **Input**: `"10/3 = 3.33"`

2. **Format**: 
   - `formatForMathJS()` → `"10/3 == 3.33"`

3. **Parse**:
   ```typescript
   parseMathExpression("10/3 == 3.33")
   // Returns AST:
   // OperatorNode {
   //   fn: "equal",
   //   args: [
   //     OperatorNode { fn: "divide", args: [10, 3] },
   //     ConstantNode { value: 3.33 }
   //   ]
   // }
   ```

4. **Evaluate**:
   - Left side: `evaluate("10/3")` → `3.3333...`
   - Right side: `evaluate("3.33")` → `3.33`

5. **Compare**:
   ```typescript
   compareNumericValues("3.33", 3.3333...)
   // Logic:
   // - "3.33" has 2 decimal places
   // - Round 3.3333... to 2 places → 3.33
   // - 3.33 == 3.33 → true
   ```

6. **Output**:
   ```json
   {
     "status": "verified_true",
     "explanation": "The statement is correct. 10/3 equals 3.333... Reasonable approximation (rounded to 2 decimal places)",
     "verificationDetails": {
       "mathJsExpression": "10/3",
       "computedValue": "3.333333",
       "steps": [...]
     }
   }
   ```

## Design Decisions

### Why Parser-based over String Manipulation?

**Problem with String Approach**:
- Can't handle nested expressions: `(2 + 2 = 4) && (3 + 3 = 6)`
- Ambiguous with multiple operators: `x = y = z`
- No understanding of mathematical structure
- Fragile with special characters

**Benefits of AST Parsing**:
- Understands mathematical structure
- Handles complex expressions correctly
- Can evaluate sub-expressions independently
- Leverages MathJS's robust parser

### Why Deterministic Comparison?

**Problem with LLM-based Comparison**:
- Inconsistent results
- Expensive API calls
- Slower processing
- Hard to test and debug

**Benefits of Code-level Comparison**:
- Consistent, predictable behavior
- Fast execution
- Testable with unit tests
- No API costs for simple cases

### Evaluation Strategy Cascade

The tool tries methods in order of efficiency:
1. **Direct Evaluation** - Fastest, no API calls
2. **Tool-based Evaluation** - When called by Claude
3. **LLM Assistance** - Only for complex cases

This minimizes costs and latency while maintaining flexibility.

## Error Handling

The tool gracefully handles various error conditions:

1. **Parse Errors**: Returns null, falls back to next method
2. **Evaluation Errors**: Logs and continues with fallback
3. **Symbolic Math**: Early detection, returns "cannot_verify"
4. **Timeouts**: 60-second limit for LLM calls
5. **Invalid Input**: Returns appropriate error messages

## Testing Strategy

The architecture supports multiple testing levels:

1. **Unit Tests** (`numeric-comparison.test.ts`)
   - Test comparison logic in isolation
   - Verify approximation rules
   - Check edge cases

2. **Parser Tests** (`mathjs-parser-utils.test.ts`)
   - Test AST parsing
   - Verify symbol conversion
   - Check equality detection

3. **Integration Tests** (`deterministic-comparison.integration.test.ts`)
   - Test with real MathJS evaluation
   - Verify end-to-end flow
   - Check real-world examples

4. **E2E Tests** (`check-math-with-mathjs.e2e.test.ts`)
   - Test with Claude API
   - Verify LLM fallback
   - Check complex statements

## Performance Considerations

- **Direct evaluation**: ~5-10ms (no API calls)
- **LLM-assisted**: ~2-5 seconds (API latency)
- **Memory**: Minimal, no caching of results
- **Concurrency**: Stateless, supports parallel execution

## Future Improvements

1. **Caching Layer**: Cache evaluation results for common expressions
2. **Extended Operators**: Support more comparison operators (≤, ≥, ≠)
3. **Symbolic Math**: Integrate symbolic math library for derivatives/integrals
4. **Batch Processing**: Evaluate multiple expressions in parallel
5. **Custom Precision**: Allow users to specify comparison precision