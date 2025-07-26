# findTextLocation LLM Fallback Analysis

## Functions That DON'T Need LLM Fallback

### 1. Spelling Error Location (`findSpellingErrorLocation`)
- **Why no LLM needed**: Spelling errors must match EXACTLY what the spell checker found
- **Current strategies sufficient**:
  - Exact match
  - Quote normalization (for apostrophes like "don't" vs "don't")
  - Case insensitive (minor case differences)
- **Example**: If spell checker says "thier" is wrong, we need to find exactly "thier", not a paraphrase

### 2. Math Expression Location (`findMathLocation`)
- **Why no LLM needed**: Math expressions need exact matching
- **Current strategies sufficient**:
  - Exact match
  - Whitespace normalization (2+2 vs 2 + 2)
  - Special math normalization (× vs * vs x)
- **Has its own**: Custom implementation that doesn't use findTextLocation

### 3. Highlight Location (`findHighlightLocation`)
- **Why no LLM needed**: User-selected text that should exist exactly
- **Current strategies sufficient**:
  - Exact match
  - Case insensitive
  - Quote normalization
- **Note**: If user highlighted it, it exists in the document

### 4. Test Cases
- **Why no LLM needed**: Tests need predictable, deterministic behavior
- **Current strategies sufficient**: All non-LLM strategies

## Functions That MIGHT Benefit from LLM Fallback

### 1. Forecast Location (`findForecastLocation`)
- **Why LLM might help**: Forecasts can be paraphrased or summarized
- **Example**: 
  - LLM extracts: "AI will transform industries by 2030"
  - Document says: "Artificial intelligence is expected to revolutionize various sectors within the next decade"
- **Current status**: Enhanced wrapper already has LLM option

### 2. Fact/Claim Location (`findFactLocation`)
- **Why LLM might help**: Facts can be stated differently
- **Example**:
  - LLM extracts: "Global temperature increased by 1.1°C"
  - Document says: "The planet has warmed by approximately 1.1 degrees Celsius"
- **Current status**: Enhanced wrapper already has LLM option

## Summary

### Definitely DON'T need LLM:
1. **Spelling errors** - Must be exact matches
2. **Math expressions** - Must be exact (with normalization)
3. **User highlights** - Already selected by user
4. **Tests** - Need deterministic behavior

### MIGHT benefit from LLM:
1. **Forecasts** - Can be paraphrased
2. **Facts/Claims** - Can be stated differently

## Recommendation

Create two implementations:

### 1. Synchronous Version (no LLM)
```typescript
// For spelling, math, highlights, tests
export function findTextLocationSync(
  searchText: string,
  documentText: string,
  options: TextLocationOptions = {}
): TextLocation | null {
  // Only use exact, fuzzy, quote normalization
  // Never use LLM fallback
}
```

### 2. Asynchronous Version (with LLM option)
```typescript
// For forecasts, facts, and future use cases
export async function findTextLocation(
  searchText: string,
  documentText: string,
  options: TextLocationOptions = {}
): Promise<TextLocation | null> {
  // All strategies including LLM fallback
}
```

This gives us:
- Performance for cases that don't need LLM
- Flexibility for cases that might benefit from LLM
- Clear API showing which functions might make network calls