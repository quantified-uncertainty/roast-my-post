# Running LLM Tests in Comprehensive Search

## Default Behavior
LLM tests are skipped by default to save time and API costs.

## How to Run LLM Tests

Simply set the environment variable when running tests:

```bash
# Run with LLM tests
RUN_LLM_TESTS=true npm test comprehensive-search.test.ts

# Or for Vitest directly
RUN_LLM_TESTS=true vitest src/tools/fuzzy-text-locator/tests/comprehensive-search.vtest.ts
```

## Requirements
- `ANTHROPIC_API_KEY` must be set in your environment
- `RUN_LLM_TESTS=true` must be set

## What Gets Skipped
When `RUN_LLM_TESTS` is not set:
- All tests in the "LLM Search" describe block
- The paraphrasing comparison test
- Any other tests that call `llmSearch()`

This typically skips ~60 LLM API calls, saving significant time and money.