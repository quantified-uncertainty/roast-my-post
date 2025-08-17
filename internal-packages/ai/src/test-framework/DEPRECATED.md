# DEPRECATED - Test Framework

**Status**: DEPRECATED - Do not use

This test framework was over-engineered and has been replaced with simpler test helpers.

## Why Deprecated?

1. **Over-engineered**: Builder pattern and custom runners are unnecessary complexity
2. **Non-idiomatic**: Doesn't follow Jest conventions
3. **Unused**: No tests actually use this framework
4. **Better alternative**: Simple helper functions in `/analysis-plugins/__tests__/helpers/`

## Migration Guide

Instead of this framework, use:
- `/analysis-plugins/__tests__/helpers/test-helpers.ts` - Simple assertion helpers
- `/analysis-plugins/__tests__/helpers/shared-fixtures.ts` - Consolidated test data
- Jest's native `it.each()` for table-driven tests

## What's Being Kept?

Some useful parts have been extracted:
- Basic type definitions
- Fixture consolidation concept (moved to shared-fixtures)
- Assertion helpers (simplified in test-helpers)

## Example Migration

**Before (Framework)**:
```typescript
const suite = suite()
  .name('Tests')
  .addScenario(scenario()
    .document('text')
    .expectComments({...})
    .build())
  .build();
await runTestSuite(suite, runner);
```

**After (Simple Helpers)**:
```typescript
it.each(testCases)('$name', async (testCase) => {
  const result = await plugin.analyze(testCase.document);
  assertAnalysisResult(result, testCase.expectations);
});
```

## Files to Remove

The following files can be safely deleted:
- `builders.ts` - Over-engineered builder classes
- `runners.ts` - Custom test runners (use Jest)
- `mocks.ts` - Complex mocking (use Jest mocks)
- `factories.ts` - Mostly redundant with fixtures

Keep for reference:
- `types.ts` - Some useful type definitions
- `assertions.ts` - Has been simplified and moved
- `fixtures.ts` - Concept moved to shared-fixtures