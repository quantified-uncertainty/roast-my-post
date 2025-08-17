# Plugin System Tests

This directory contains comprehensive tests for the plugin system, including unit tests, integration tests, and end-to-end tests.

## Test Structure

### Integration Tests
- `single-plugin-agents.integration.test.ts` - **Complete integration tests for all single-plugin agents**
- `plugin-system-full-e2e.integration.test.ts` - End-to-end plugin system tests
- `parallel-execution.integration.test.ts` - Tests for parallel plugin execution
- `extraction-boundaries.integration.test.ts` - Tests for text extraction boundaries

### Unit Tests
- `plugin-interface-consistency.unit.test.ts` - Plugin interface consistency tests
- `plugin-state-isolation.test.ts` - Plugin state isolation tests

### Test Fixtures
- `fixtures/spelling-documents.ts` - Test documents for spelling/grammar checking
- `fixtures/math-documents.ts` - Test documents for math verification
- `fixtures/fact-documents.ts` - Test documents for fact checking
- `fixtures/forecast-documents.ts` - Test documents for forecast analysis
- `fixtures/link-documents.ts` - Test documents for link verification

### Test Utilities
- `helpers/test-utils.ts` - Common test assertion helpers and performance utilities

## Single-Plugin Agent Integration Tests

The `single-plugin-agents.integration.test.ts` file provides comprehensive testing for:

1. **Spelling & Grammar Agent** - Tests error detection, clean documents, conventions
2. **Math Checker Agent** - Tests calculations, unit conversions, statistical analysis
3. **Fact Checker Agent** - Tests factual accuracy verification
4. **Forecast Checker Agent** - Tests prediction and timeline extraction
5. **Link Verifier Agent** - Tests URL validation and broken link detection

Each test verifies:
- Analysis output format and content
- Performance metrics (cost, processing time)
- Highlight locations (start/end positions)
- Grade calculation
- Summary quality
- Comment accuracy

## Running Tests

### All Integration Tests
```bash
./run-integration-tests.sh
```

### Specific Test Suites
```bash
# Single-plugin agent tests only
pnpm --filter @roast/ai test single-plugin-agents.integration.test.ts

# Run tests for specific agent
pnpm --filter @roast/ai test single-plugin-agents.integration.test.ts -- --testNamePattern="Math Checker"

# Run non-LLM tests (no API key needed)
pnpm --filter @roast/ai test single-plugin-agents.integration.test.ts -- --testNamePattern="without links"
```

### Unit Tests
```bash
pnpm --filter @roast/ai test -- --testMatch="**/*.unit.test.ts"
```

## Test Coverage

The plugin system now has comprehensive test coverage:
- ✅ Individual plugin functionality
- ✅ Plugin manager orchestration
- ✅ Error handling and recovery
- ✅ Performance benchmarking
- ✅ Highlight position accuracy
- ✅ Grade calculation
- ✅ Cost tracking
- ✅ Parallel execution
- ✅ State isolation

## Environment Setup

For LLM-based tests:
```bash
export ANTHROPIC_API_KEY="your-api-key"
```

Note: Link verification tests can run without an API key.