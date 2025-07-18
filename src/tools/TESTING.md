# Tool Testing Guide

This guide explains how to write comprehensive tests for tools in the RoastMyPost platform.

## Overview

All tools should have comprehensive test coverage to ensure reliability and maintainability. Tests should cover:
- Input validation
- Core functionality
- Error handling
- Cost tracking (if applicable)
- Hook execution
- Access control

## Test Structure

Each tool test should follow this structure:

```typescript
describe('ToolName', () => {
  // 1. Configuration tests
  describe('configuration', () => {
    // Verify tool metadata
  });
  
  // 2. Input validation tests
  describe('input validation', () => {
    // Test schema validation
  });
  
  // 3. Core functionality tests
  describe('execute', () => {
    // Test main tool logic
  });
  
  // 4. Hook tests
  describe('hooks', () => {
    // Test beforeExecute/afterExecute
  });
  
  // 5. Error handling tests
  describe('error handling', () => {
    // Test error scenarios
  });
  
  // 6. Access control tests (if applicable)
  describe('access control', () => {
    // Test validateAccess
  });
});
```

## Using the Test Template

A test template is provided at `src/tools/base/tool.test.template.ts`. To create tests for a new tool:

1. Copy the template to your tool directory
2. Rename it to `[tool-name].test.ts`
3. Replace all `__TOOL_CLASS__` placeholders with your tool class name
4. Implement the test cases specific to your tool

## Key Testing Patterns

### 1. Mocking External Dependencies

Always mock external API calls and services:

```typescript
jest.mock('@/lib/claude/wrapper', () => ({
  callClaudeWithTool: jest.fn()
}));
```

### 2. Testing Input Validation

Test both invalid and valid inputs:

```typescript
it('should validate required fields', async () => {
  const invalidInput = {}; // Missing required fields
  await expect(tool.run(invalidInput, mockContext))
    .rejects.toThrow(z.ZodError);
});

it('should accept valid input', async () => {
  const validInput = { /* valid data */ };
  // Mock the execute method
  jest.spyOn(tool, 'execute').mockResolvedValueOnce(/* output */);
  
  const result = await tool.run(validInput, mockContext);
  expect(result).toBeDefined();
});
```

### 3. Testing Cost Tracking

For tools that make LLM calls, test cost tracking:

```typescript
it('should include cost data when available', async () => {
  const result = await tool.execute(input, mockContext);
  
  expect(result.cost).toBeDefined();
  expect(result.cost.totalUSD).toBeGreaterThan(0);
  expect(result.cost.totalInputTokens).toBeGreaterThan(0);
  expect(result.cost.totalOutputTokens).toBeGreaterThan(0);
});
```

### 4. Testing Error Scenarios

Test various error conditions:

```typescript
it('should handle API errors gracefully', async () => {
  const error = new Error('API error');
  (externalApi as jest.Mock).mockRejectedValueOnce(error);
  
  await expect(tool.execute(input, mockContext))
    .rejects.toThrow('API error');
  
  expect(mockContext.logger.error).toHaveBeenCalled();
});
```

### 5. Testing Hooks

Verify hooks are called with correct parameters:

```typescript
it('should call beforeExecute hook', async () => {
  jest.spyOn(tool, 'beforeExecute');
  await tool.run(input, mockContext);
  
  expect(tool.beforeExecute).toHaveBeenCalledWith(input, mockContext);
});
```

## Current Test Coverage

| Tool | Test File | Status |
|------|-----------|--------|
| check-math | ✅ Has tests | Complete |
| check-spelling-grammar | ✅ Has tests | Complete |
| extract-factual-claims | ✅ Has tests | Complete |
| extract-forecasting-claims | ✅ Has tests | Complete |
| fact-check | ✅ Has tests | Complete |
| forecaster | ✅ Has tests | Complete with cost tracking |
| perplexity-research | ✅ Has tests | Complete |

## Running Tests

```bash
# Run all tool tests
npm test src/tools

# Run specific tool tests
npm test src/tools/forecaster/forecaster.test.ts

# Run with coverage
npm test -- --coverage src/tools

# Run in watch mode
npm test -- --watch src/tools/forecaster
```

## Best Practices

1. **Keep tests focused**: Each test should verify one specific behavior
2. **Use descriptive test names**: Test names should clearly describe what is being tested
3. **Mock external dependencies**: Never make actual API calls in tests
4. **Test edge cases**: Include tests for empty inputs, large inputs, and boundary conditions
5. **Verify logging**: Check that appropriate log messages are generated
6. **Test async behavior**: Use proper async/await patterns for testing promises
7. **Clean up after tests**: Use `beforeEach` to reset mocks and state

## Example: Complete Test File

See `src/tools/check-spelling-grammar/check-spelling-grammar.test.ts` for a comprehensive example that demonstrates all testing patterns.

## Adding Tests to CI

All tests in the `src/tools` directory are automatically included in the CI pipeline. Ensure your tests:
- Don't require external API keys
- Run quickly (< 5 seconds per test suite)
- Are deterministic (no random failures)
- Clean up any resources they create