# Unified Test Framework

A DRY, elegant testing framework for plugins, tools, and agents in the AI system.

## Overview

This framework eliminates redundancy across our test suite by providing:
- **Fluent builders** for creating test scenarios
- **Reusable factories** for common test objects
- **Shared fixtures** for test documents
- **Unified assertions** across all test types
- **Comprehensive mocking** utilities
- **Flexible test runners** for different components

## Architecture

```
test-framework/
├── index.ts          # Main exports
├── types.ts          # Core type definitions
├── builders.ts       # Fluent builders for scenarios and suites
├── factories.ts      # Object factories for test data
├── fixtures.ts       # Shared test documents and expected results
├── assertions.ts     # Unified assertion utilities
├── mocks.ts          # Mock utilities for plugins, tools, and LLMs
└── runners.ts        # Test execution engines
```

## Usage Examples

### 1. Creating Test Scenarios with Builders

```typescript
import { scenario, suite } from '@roast/ai/test-framework';

const testScenario = scenario()
  .name('Detects spelling errors')
  .document('This contians spelling mistaks.')
  .expectComments({
    count: { min: 2 },
    mustFind: ['contians', 'mistaks'],
    verifyHighlights: true
  })
  .expectAnalysis({
    summaryContains: ['spelling'],
    maxGrade: 70
  })
  .expectPerformance({
    maxCost: 0.05,
    maxTimeMs: 30000
  })
  .build();
```

### 2. Building Test Suites

```typescript
const testSuite = suite()
  .name('Spelling Plugin Tests')
  .category('plugin')
  .addScenario(testScenario)
  .addScenario(b => b
    .name('Clean document')
    .document('Perfect text.')
    .expectComments({ count: { max: 0 } })
    .expectAnalysis({ minGrade: 95 })
  )
  .beforeEach(() => jest.clearAllMocks())
  .build();
```

### 3. Using Factories

```typescript
import { 
  DocumentFactory, 
  CommentFactory, 
  AnalysisResultFactory 
} from '@roast/ai/test-framework';

// Create test documents
const doc = DocumentFactory.withSpellingErrors();
const mathDoc = DocumentFactory.withMathErrors();

// Create mock comments
const comment = CommentFactory.spellingError('teh', 'the', 10);

// Create mock results
const result = AnalysisResultFactory.withErrors(3, 'spelling');
```

### 4. Running Tests

```typescript
import { PluginTestRunner, runTestSuite } from '@roast/ai/test-framework';
import { SpellingPlugin } from '../plugins/spelling';

const plugin = new SpellingPlugin();
const runner = new PluginTestRunner(plugin);

await runTestSuite(testSuite, runner);
```

### 5. Using Shared Fixtures

```typescript
import { TestDocuments, ExpectedResults } from '@roast/ai/test-framework';

const testDoc = TestDocuments.spelling.withErrors;
const expected = ExpectedResults.spelling.withErrors;

scenario()
  .document(testDoc)
  .expectComments({
    count: { min: expected.minErrors },
    mustFind: expected.mustFind
  });
```

### 6. Mock Management

```typescript
import { MockManager, MockPlugin } from '@roast/ai/test-framework';

const mockManager = MockManager.fromConfig({
  pluginResults: new Map([
    ['SPELLING', AnalysisResultFactory.withErrors(3)]
  ]),
  delay: 100 // Simulate processing time
});

// Use in tests
const plugin = mockManager.getPlugin('SPELLING');
const metrics = mockManager.getMetrics();
```

## Test Categories

### Plugin Tests
Test individual analysis plugins (spelling, math, facts, etc.)

```typescript
const runner = new PluginTestRunner(plugin);
```

### Tool Tests
Test individual tools with their execute methods

```typescript
const runner = new ToolTestRunner(tool.execute, 'ToolName');
```

### Agent Tests
Test complete agents that combine multiple plugins

```typescript
const runner = new AgentTestRunner(agent);
```

### Integration Tests
Test full system workflows

```typescript
suite()
  .category('integration')
  .addScenario(comprehensiveTest)
```

## Assertions

The framework provides comprehensive assertions:

```typescript
expectAnalysisResult(actual, {
  comments: {
    count: { min: 2, max: 10 },
    mustFind: ['error1', 'error2'],
    highlights: {
      verifyPositions: true,
      verifyNoOverlaps: true
    }
  },
  analysis: {
    summaryContains: ['found', 'errors'],
    grade: { min: 60, max: 80 }
  },
  performance: {
    maxCost: 0.10,
    maxTimeMs: 30000
  }
});
```

## Benefits

### 1. DRY (Don't Repeat Yourself)
- Shared fixtures eliminate duplicate test documents
- Factories reduce boilerplate for creating test objects
- Unified assertions work across all test types

### 2. Elegance
- Fluent builder pattern for readable test creation
- Chainable methods for natural test specification
- Clean separation of concerns

### 3. Maintainability
- Central location for test utilities
- Easy to update expected results
- Consistent patterns across all tests

### 4. Flexibility
- Support for mocked and real execution
- Configurable timeouts and API key requirements
- Extensible for new test types

## Migration Guide

### Before (Old Pattern)
```typescript
describe('SpellingPlugin', () => {
  it('should detect errors', async () => {
    const doc = 'This contians errors.';
    const plugin = new SpellingPlugin();
    const result = await plugin.analyze([], doc);
    
    expect(result.comments.length).toBeGreaterThan(0);
    expect(result.summary).toContain('spelling');
    // ... many manual assertions
  });
});
```

### After (New Pattern)
```typescript
describe('SpellingPlugin', () => {
  const testSuite = suite()
    .name('Spelling Tests')
    .category('plugin')
    .addScenario(b => b
      .name('Detects errors')
      .document(TestDocuments.spelling.withErrors)
      .expectComments({ 
        count: { min: 1 },
        mustFind: ['contians']
      })
      .expectAnalysis({ 
        summaryContains: ['spelling'] 
      })
    )
    .build();

  it('should pass all tests', async () => {
    await runTestSuite(testSuite, new PluginTestRunner(new SpellingPlugin()));
  });
});
```

## Best Practices

1. **Use shared fixtures** - Don't create new test documents unless necessary
2. **Leverage factories** - Use factories for creating mock objects
3. **Chain assertions** - Use the fluent API for readable tests
4. **Set appropriate timeouts** - Configure timeouts based on test complexity
5. **Mock external calls** - Use mocks for faster, more reliable tests
6. **Group related tests** - Use suites to organize related scenarios

## Extension Points

The framework is designed to be extensible:

1. **Add new factories** in `factories.ts`
2. **Add new fixtures** in `fixtures.ts`
3. **Create custom runners** by extending `TestRunner`
4. **Add new assertion types** in `assertions.ts`
5. **Create specialized mocks** in `mocks.ts`

## Performance

The framework includes built-in performance tracking:
- Execution time per test
- Total cost calculation
- LLM call counting
- Memory usage tracking (when enabled)

## CI/CD Integration

Tests automatically skip when requirements aren't met:
- No API key available
- Timeout exceeded
- Mock mode enabled

This ensures CI pipelines don't fail due to missing credentials while still providing comprehensive local testing.