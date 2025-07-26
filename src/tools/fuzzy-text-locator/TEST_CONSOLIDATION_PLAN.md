# Test Consolidation Plan for Fuzzy Text Locator

## Current State
- 4 test files with 1,867 total lines
- Significant overlap and redundancy
- Many tests that duplicate coverage

## Proposed Consolidated Structure

### 1. `comprehensive-search.test.ts` (KEEP AS IS - ~500 lines)
**Purpose**: Comprehensive integration tests - DO NOT DELETE
- This file provides thorough end-to-end testing
- Keep all existing tests in this file
- This ensures we don't lose any important test coverage

### 2. `fuzzy-text-locator.test.ts` (~200 lines)
**Purpose**: Core API tests

```typescript
describe('Fuzzy Text Locator API', () => {
  describe('Basic functionality', () => {
    test('exact match')
    test('case insensitive match')
    test('not found returns null')
    test('empty input handling')
  })
  
  describe('Options handling', () => {
    test('partialMatch option')
    test('maxTypos option')
    test('normalizeQuotes option')
    test('caseSensitive option')
    test('useLLMFallback option')
  })
  
  describe('Multi-strategy cascade', () => {
    test('exact → partial → fuzzy → LLM cascade')
    test('confidence scores reflect strategy used')
  })
})
```

### 3. `search-strategies.test.ts` (~300 lines)
**Purpose**: Simplified unit tests for individual strategies

```typescript
describe('Search Strategies', () => {
  describe('exactSearch', () => {
    test('finds exact match')
    test('returns null when not found')
    test('handles special characters')
  })
  
  describe('partialSearch', () => {
    test('finds truncated text')
    test('handles first N characters')
    test('minimum length requirements')
  })
  
  describe('uFuzzySearch', () => {
    test('single character typo')
    test('multiple typos within threshold')
    test('transpositions')
    test('missing characters')
    test('extra characters')
    test('quote normalization')
    test('whitespace normalization')
  })
  
  describe('llmSearch', () => {
    test.skip('paraphrased content') // Skip by default
    test.skip('semantic similarity')
    test.skip('multiple occurrences')
    test.skip('context disambiguation')
  })
})
```

## Tests to Remove

### 1. Redundant Quote Tests
Keep only 1 comprehensive test that covers:
- Smart quotes (", ", ', ')
- Straight quotes (", ')
- Apostrophes in contractions
- Mixed quote scenarios

### 2. Domain-Specific Tests
Remove:
- Academic paper scenarios
- Legal document tests
- Medical terminology tests
- Financial report tests

These are too specific and don't add value to the core functionality.

### 3. Excessive Typo Variations
Keep only essential typo tests:
- Single character substitution
- Single character deletion
- Single character insertion
- Character transposition
- Multiple typos (up to maxTypos)

Remove:
- Every possible typo combination
- Specific word misspellings
- Domain-specific typos

### 4. Overlapping Whitespace Tests
Keep only:
- Multiple spaces → single space
- Tabs and spaces mixed
- Line breaks as word separators

Remove:
- Every possible whitespace combination
- Non-breaking space variations (keep 1 test)
- Complex indentation scenarios

### 5. Edge Cases That Never Occur
Remove:
- Nested parentheses with quotes
- Mathematical notation tests
- Scientific notation tests
- Roman numeral tests
- Ligature tests (ﬁ, ﬂ)

## Files to Modify

### Keep Unchanged:
- `comprehensive-search.test.ts` - DO NOT MODIFY

### Simplify These Files:
1. **`text-location-finder.test.ts`** (436 lines → ~200 lines)
   - Remove duplicate tests covered in comprehensive-search.test.ts
   - Focus on core API validation
   - Keep error handling tests

2. **`text-location-finder-tricky.test.ts`** (443 lines → ~150 lines)
   - Keep only the truly tricky cases
   - Remove academic/legal/medical domain tests
   - Remove redundant punctuation variations

3. **`llmSearch.test.ts`** (80 lines → ~50 lines)
   - Keep but simplify
   - Mark expensive tests with .skip by default
   - Keep one test for each major LLM capability

## Implementation Steps

1. **Backup existing tests**
   ```bash
   cp -r tests tests-backup-$(date +%Y%m%d)
   ```

2. **Extract essential tests**
   - Review each old test file
   - Copy only unique, valuable test cases
   - Consolidate similar tests into single cases

3. **Organize by functionality**
   - Group related tests together
   - Use descriptive test names
   - Add comments explaining what's being tested

4. **Add performance tests**
   ```typescript
   describe('Performance', () => {
     test('handles large documents (100KB+)')
     test('handles many concurrent searches')
   })
   ```

## Expected Benefits

1. **~50% reduction in test code** (1,867 → ~900 lines including comprehensive)
2. **Faster test execution** (fewer redundant tests in simplified files)
3. **Clearer test intent** (better organization)
4. **Easier maintenance** (less duplication)
5. **Safety net maintained** (comprehensive-search.test.ts unchanged)

## Summary of Changes

- **comprehensive-search.test.ts**: Keep all 500 lines (NO CHANGES)
- **text-location-finder.test.ts**: 436 → 200 lines
- **text-location-finder-tricky.test.ts**: 443 → 150 lines  
- **llmSearch.test.ts**: 80 → 50 lines
- **Other test files**: ~400 → 0 lines (removed/consolidated)

Total: 1,867 → ~900 lines (52% reduction while keeping comprehensive tests)

## Validation

After consolidation:
1. Run coverage report: `npm test -- --coverage`
2. Ensure >90% coverage of core functionality
3. Verify all search strategies are tested
4. Check that edge cases are covered

## Notes

- Keep LLM tests but skip by default (they're expensive)
- Focus on testing the public API, not internal functions
- Each test should have a clear purpose
- Avoid testing implementation details