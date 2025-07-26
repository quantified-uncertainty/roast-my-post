# Fuzzy Text Locator - Refactoring Plan

## Issues Identified

### 1. Test Redundancy (1,867 lines → ~600 lines)
- 4 test files with overlapping coverage
- Many duplicate test cases
- Inconsistent test patterns

### 2. Code Duplication
- 4 different `findTextLocation` implementations across codebase
- Unused utility functions in types.ts
- Duplicate normalization logic

### 3. Over-Engineering
- uFuzzySearch has internal cascade duplicating main logic
- Special handlers for cases already covered
- Complex fallback strategies that are rarely triggered

## Immediate Actions

### 1. Consolidate Tests
```
Before: 4 files, 1,867 lines
After:  2 files, ~600 lines

fuzzy-text-locator.test.ts (200 lines)
- Tool integration tests
- API validation
- End-to-end scenarios

search-strategies.test.ts (400 lines)
- Unit tests per strategy
- Key edge cases only
- Performance tests
```

### 2. Remove Dead Code
- [ ] Remove `getLineNumberAtPosition` and `getLineAtPosition` from types.ts
- [ ] Remove backward compatibility type aliases
- [ ] Remove `DocumentLocation` interface (duplicated)

### 3. Simplify uFuzzySearch
- [ ] Remove `handleShortQuery()` - integrate into main logic
- [ ] Remove `handlePunctuationQuery()` - unnecessary
- [ ] Remove `slidingWindowFuzzySearch()` - not effective
- [ ] Consolidate fuzzy matching logic

### 4. Consolidate findTextLocation Implementations
- [ ] Make fuzzy-text-locator the single source of truth
- [ ] Update all plugins to use it
- [ ] Delete duplicate implementations

## Test Consolidation Strategy

### Keep These Test Categories:
1. **Basic Operations** (10 tests)
   - Exact match
   - Case sensitivity
   - Not found
   - Empty inputs

2. **Quote/Punctuation** (5 tests)
   - Smart quotes
   - Apostrophes
   - One combined punctuation test

3. **Whitespace** (3 tests)
   - Multiple spaces
   - Line breaks
   - Tabs

4. **Fuzzy Matching** (10 tests)
   - Single typo
   - Multiple typos
   - Missing characters
   - Extra characters
   - Transpositions

5. **Partial Matching** (5 tests)
   - Truncated text
   - First N words
   - Long text scenarios

6. **LLM Fallback** (5 tests)
   - Paraphrasing
   - Semantic similarity
   - Context usage

7. **Performance** (2 tests)
   - Large documents
   - Many searches

### Remove These Tests:
- Duplicate quote variations (keep 1 comprehensive test)
- Redundant typo combinations
- Overlapping whitespace scenarios
- Academic/legal/medical domain tests (too specific)
- Unicode edge cases (keep 1 test)
- Nested structure tests (not core functionality)

## Expected Benefits

1. **50% less test code** - Easier to maintain
2. **Faster test runs** - Focus on essential cases
3. **Clearer code** - Remove special cases and fallbacks
4. **Single source of truth** - One findTextLocation implementation
5. **Better performance** - Less redundant processing