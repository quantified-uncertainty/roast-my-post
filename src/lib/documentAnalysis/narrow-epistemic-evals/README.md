# Narrow Epistemic Evaluations - Math Error Checker

A chunk-level math error checker based on the pattern from the spelling/grammar checker, designed for detecting mathematical errors in text.

## Overview

The math checker analyzes text chunks (100-400 words) for mathematical errors including:
- Arithmetic/calculation errors
- Unit conversion mistakes
- Logic errors in mathematical reasoning
- Incorrect mathematical notation
- Conceptual misunderstandings

## Files

- `mathChecker.ts` - Core implementation with LLM-based math error detection
- `advancedMathTestCases.ts` - Test cases with subtle mathematical errors across various domains
- `errorExplanation.md` - Detailed explanations of deliberate errors in test cases

## Usage

The math checker is integrated into the main project. Run tests using:

```bash
# From project root
npm run test:math-checker           # Basic test
npm run test:math-checker:advanced  # Advanced mathematical errors
```

The implementation uses the shared Anthropic client from the main project and respects the project's caching and configuration settings.

## Example Output

```
--- Analyzing Chunk 1/3 ---
Lines 1-5 (150 words)

❌ Found 2 error(s):

  Error 1:
  - Location: Lines 2-2
  - Type: calculation (major)
  - Highlighted: "from $2 million to $3.5 million"
  - Description: Incorrect calculation: 50% increase from $2 million would be $3 million, not $3.5 million

  Error 2:
  - Location: Lines 4-4
  - Type: calculation (critical)
  - Highlighted: "2 + 2 = 5"
  - Description: Basic arithmetic error: 2 + 2 = 4, not 5
```

## Implementation Notes

- Uses Claude 3.5 Sonnet with tool use for structured output
- Processes chunks sequentially (parallel processing could be added)
- Categorizes errors by type and severity
- Simple chunk splitting (could be improved to respect sentence boundaries)

## Future Enhancements

- Add support for analyzing mathematical formulas in LaTeX
- Implement smarter chunking that preserves mathematical context
- Add caching to avoid re-analyzing identical chunks
- Support for different mathematical notation styles
- Integration with the main document analysis pipeline