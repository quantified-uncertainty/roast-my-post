# Testing Strategy

## Overview

Our testing strategy is organized around **cost management** and **external dependencies** to ensure fast, reliable CI while enabling comprehensive testing when needed.

## Test Categories

### File Naming Convention

Tests are categorized by their suffix:

| Suffix | Purpose | Dependencies | Cost | CI |
|--------|---------|--------------|------|-----|
| `*.test.ts` | Unit tests | None | Free | ✅ Yes |
| `*.integration.test.ts` | Integration tests | Database, internal APIs | Low | ✅ Yes |
| `*.e2e.test.ts` | End-to-end tests | External APIs | Medium | ❌ No |
| `*.llm.test.ts` | LLM tests | Anthropic, OpenAI APIs | **High** | ❌ No |

### Test Scripts

```bash
# Development (fast feedback)
npm run test:fast         # Unit + integration tests
npm run test:unit         # Unit tests only
npm run test:integration  # Integration tests only

# Full testing (when needed)
npm test                  # All tests
npm run test:without-llms # Everything except expensive LLM calls

# Specific categories
npm run test:e2e         # External API tests (requires API keys)
npm run test:llm         # LLM tests (expensive, requires API keys)

# CI/Production
npm run test:ci          # What runs in GitHub Actions
```

## Writing Tests

### Choosing the Right Category

**Unit Tests (*.test.ts)**
- Pure functions, components, utilities
- No external dependencies
- Fast execution (< 100ms per test)
- Example: `highlightUtils.test.ts`

**Integration Tests (*.integration.test.ts)**
- Database operations
- Internal API endpoints
- Component integration
- Example: `auth-api.integration.test.ts`

**E2E Tests (*.e2e.test.ts)**
- External API integrations (Firecrawl, LessWrong, EA Forum)
- Full workflow testing
- Requires API keys
- Example: `articleImport.e2e.test.ts`

**LLM Tests (*.llm.test.ts)**
- Anthropic Claude API calls
- OpenAI API calls
- Expensive operations (> $0.01 per test)
- Example: `comprehensiveAnalysis.llm.test.ts`

### Environment Guards

For tests that require API keys, always add environment guards:

```typescript
// E2E test example
beforeAll(() => {
  if (!process.env.FIRECRAWL_KEY) {
    console.log("Skipping E2E test - FIRECRAWL_KEY not set");
    return;
  }
});

// LLM test example
beforeAll(() => {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log("Skipping LLM test - ANTHROPIC_API_KEY not set");
    return;
  }
});
```

### Cost Considerations

**Free/Low Cost:**
- Unit tests with mocked dependencies
- Integration tests using test database
- Static analysis and linting

**Medium Cost:**
- External API calls (Firecrawl, web scraping)
- Third-party service integrations
- Large dataset processing

**High Cost:**
- LLM API calls (Claude, GPT)
- Image generation/processing
- Large-scale data analysis

## CI/CD Strategy

### GitHub Actions

The CI pipeline runs `npm run test:ci` which excludes:
- E2E tests (external dependencies, flaky)
- LLM tests (expensive, rate limits)

This ensures:
- ✅ Fast CI builds (< 5 minutes)
- ✅ No external API failures
- ✅ No unexpected costs
- ✅ Reliable testing

### Local Development

Developers should run:
- `npm run test:fast` during development
- `npm run test:without-llms` before pushing
- `npm run test:e2e` when testing external integrations
- `npm run test:llm` only when necessary

## Test Organization Examples

### Good Test Organization

```
src/lib/
  articleImport.test.ts           # Unit tests for pure functions
  articleImport.integration.test.ts # Database/internal API tests
  articleImport.e2e.test.ts       # External API integration tests

src/lib/analysis/
  textProcessing.test.ts          # Unit tests
  documentAnalysis.llm.test.ts    # LLM-powered analysis tests
```

### Environment Setup

Create `.env.test.local` for local testing:

```bash
# Required for integration tests
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/roast_my_post_test"

# Required for E2E tests
FIRECRAWL_KEY="your-firecrawl-key"

# Required for LLM tests (expensive!)
ANTHROPIC_API_KEY="your-anthropic-key"
OPENAI_API_KEY="your-openai-key"
```

## Debugging Test Failures

### CI Test Failures

If CI tests fail, run locally:
```bash
npm run test:ci
```

This runs the exact same tests as CI.

### Test Category Issues

- **Unit test failing**: Check mocks and dependencies
- **Integration test failing**: Check database state and migrations
- **E2E test failing**: Check API keys and external service status
- **LLM test failing**: Check API keys, rate limits, and costs

## Console Output Suppression

By default, tests suppress console output to keep test logs clean. This prevents confusing output like error logs from test scenarios that intentionally trigger errors.

### How It Works

1. **Automatic Suppression**: The Jest setup file (`/config/jest/setup.js`) mocks console methods during tests
2. **Debug Access**: `console.debug` remains available for debugging
3. **Environment Control**: Set `SHOW_TEST_LOGS=true` to see all console output
4. **Quiet Mode**: Use `--silent` flag for even cleaner output

### Running Tests with Different Output Modes

```bash
# Default: Console output suppressed
npm run test

# Show all console output
SHOW_TEST_LOGS=true npm run test

# Quiet mode: Minimal test output
npm run test:quiet
npm run test:ci:quiet

# Debug specific test with full output
SHOW_TEST_LOGS=true npm test -- highlightUtils.test.ts
```

### Handling Console Output in Tests

If you need to verify console output in a specific test:

```typescript
describe('Error logging', () => {
  beforeEach(() => {
    global.restoreConsole(); // Restore real console
  });
  
  afterEach(() => {
    global.mockConsole(); // Re-mock console
  });
  
  test('logs errors correctly', () => {
    const spy = jest.spyOn(console, 'error');
    myFunction(); // Function that calls console.error
    expect(spy).toHaveBeenCalledWith('Expected error');
  });
});
```

### Why Console Suppression?

Tests often trigger error scenarios to ensure proper error handling. Without suppression, test output becomes cluttered with expected errors, making it hard to identify real issues. For example:

- Authentication tests that verify error handling
- Validation tests that check error messages
- API tests that ensure proper error responses

These all generate console errors that are expected and tested for, but would otherwise clutter the test output.

## Best Practices

1. **Start with unit tests** - fastest feedback loop
2. **Use integration tests** for database operations
3. **Reserve E2E tests** for critical external integrations
4. **Minimize LLM tests** - they're expensive and slow
5. **Add environment guards** for all external dependencies
6. **Keep tests focused** - one concept per test file
7. **Mock external dependencies** in unit tests
8. **Use descriptive test names** that explain the scenario
9. **Keep test output clean** - use console suppression by default
10. **Use `SHOW_TEST_LOGS=true`** when debugging test failures

## Migration Guide

If you have existing tests that don't follow this convention:

1. **Identify dependencies**: What does the test require?
2. **Rename file**: Add appropriate suffix
3. **Add environment guards**: For external dependencies
4. **Update imports**: If file moved
5. **Test locally**: Run the specific test category
6. **Verify CI**: Ensure CI still passes

This strategy ensures we maintain fast, reliable CI while enabling comprehensive testing when needed.