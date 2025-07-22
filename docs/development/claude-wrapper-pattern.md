# Claude Wrapper Pattern Documentation

## Overview

The Claude wrapper pattern provides a centralized, consistent way to interact with the Anthropic Claude API across the codebase. It handles Helicone integration, LLM interaction tracking, token counting, and error handling automatically.

## Core Benefits

1. **Centralized Configuration**: All model configuration in one place
2. **Automatic Tracking**: LLM interactions tracked automatically for debugging and cost monitoring
3. **Helicone Integration**: Built-in support for Helicone API analytics
4. **Type Safety**: Full TypeScript support with proper types
5. **Consistent Error Handling**: Standardized error handling across all Claude calls
6. **Tool Use Support**: Simplified interface for Claude's tool use feature

## Basic Usage

### Simple Text Completion

```typescript
import { callClaude } from '@/lib/claude/wrapper';

const { response, interaction } = await callClaude({
  messages: [{
    role: "user",
    content: "Analyze this text for factual accuracy..."
  }],
  system: "You are a fact-checking assistant.",
  max_tokens: 1000,
  temperature: 0
});

// Access the response
const content = response.content[0].text;

// The interaction is automatically tracked with token counts
console.log(`Used ${interaction.tokensUsed.total} tokens`);
```

### Using Tools (Structured Output)

```typescript
import { callClaudeWithTool } from '@/lib/claude/wrapper';
import { z } from 'zod';

// Define your expected output structure
interface AnalysisResult {
  errors: Array<{
    text: string;
    correction: string;
    type: 'spelling' | 'grammar';
  }>;
}

const result = await callClaudeWithTool<AnalysisResult>({
  messages: [{
    role: "user",
    content: "Check this text for errors: ..."
  }],
  system: "You are a grammar checking assistant.",
  toolName: "report_errors",
  toolDescription: "Report spelling and grammar errors",
  toolSchema: {
    type: "object",
    properties: {
      errors: {
        type: "array",
        items: {
          type: "object",
          properties: {
            text: { type: "string" },
            correction: { type: "string" },
            type: { type: "string", enum: ["spelling", "grammar"] }
          },
          required: ["text", "correction", "type"]
        }
      }
    },
    required: ["errors"]
  }
});

// Access the structured result
const errors = result.toolResult.errors;
```

### Accumulating Interactions

For tracking multiple LLM calls in a single operation:

```typescript
const llmInteractions: RichLLMInteraction[] = [];

// First call
await callClaude({
  messages: [{ role: "user", content: "First question" }]
}, llmInteractions);

// Second call - interactions are accumulated
await callClaude({
  messages: [{ role: "user", content: "Second question" }]
}, llmInteractions);

// llmInteractions now contains both interactions
console.log(`Total calls: ${llmInteractions.length}`);
```

## Model Configuration

The wrapper provides centralized model configuration:

```typescript
export const MODEL_CONFIG = {
  analysis: 'claude-3-5-sonnet-20241022',    // Main analysis model
  routing: 'claude-3-haiku-20240307',         // Fast routing decisions
  forecasting: 'claude-3-5-sonnet-20241022'   // Forecasting tasks
} as const;
```

You can override the default model:

```typescript
await callClaude({
  model: MODEL_CONFIG.routing,  // Use the faster model
  messages: [{ role: "user", content: "..." }]
});
```

## Best Practices

### 1. Always Use the Wrapper

Never create Anthropic clients directly. Always use the wrapper for consistency:

```typescript
// ❌ Don't do this
const anthropic = createAnthropicClient();
const response = await anthropic.messages.create(...);

// ✅ Do this
const { response, interaction } = await callClaude(...);
```

### 2. Track Interactions for Cost Monitoring

When implementing a feature that makes multiple LLM calls, accumulate interactions:

```typescript
export async function analyzeDocument(doc: Document) {
  const llmInteractions: RichLLMInteraction[] = [];
  
  // Multiple analysis steps
  const { response: summary } = await callClaude({
    messages: [{ role: "user", content: `Summarize: ${doc.content}` }]
  }, llmInteractions);
  
  const { response: analysis } = await callClaude({
    messages: [{ role: "user", content: `Analyze: ${doc.content}` }]
  }, llmInteractions);
  
  // Return interactions for cost tracking
  return {
    summary,
    analysis,
    llmInteractions  // Contains all LLM calls made
  };
}
```

### 3. Use Tool Calls for Structured Output

When you need structured data back from Claude, use `callClaudeWithTool`:

```typescript
// ❌ Don't parse JSON from text responses
const response = await callClaude({
  messages: [{ role: "user", content: "Return JSON with errors..." }]
});
const errors = JSON.parse(response.content[0].text); // Error prone!

// ✅ Use tool calls for guaranteed structure
const result = await callClaudeWithTool<{ errors: Error[] }>({
  toolName: "report_errors",
  toolSchema: { /* schema */ }
});
const errors = result.toolResult.errors; // Type-safe!
```

### 4. Use Appropriate Models

Choose the right model for the task:

```typescript
import { MODEL_CONFIG } from '@/lib/claude/wrapper';

// Fast, simple decisions
await callClaude({
  model: MODEL_CONFIG.routing,
  messages: [{ role: "user", content: "Should this be fact-checked?" }]
});

// Complex analysis
await callClaude({
  model: MODEL_CONFIG.analysis,
  messages: [{ role: "user", content: "Provide detailed analysis..." }]
});
```

### 5. Handle Errors Gracefully

The wrapper will throw on API errors. Always wrap in try-catch:

```typescript
try {
  const { response, interaction } = await callClaude({
    messages: [{ role: "user", content: "..." }]
  });
  // Process response
} catch (error) {
  console.error('Claude API error:', error);
  // Handle gracefully - maybe return cached result or degraded response
}
```

## Testing

### Unit Tests

Mock the wrapper for unit tests:

```typescript
// In your test file
jest.mock('@/lib/claude/wrapper');

import { callClaude } from '@/lib/claude/wrapper';
const mockCallClaude = callClaude as jest.MockedFunction<typeof callClaude>;

// In your test
mockCallClaude.mockResolvedValue({
  response: {
    content: [{ type: 'text', text: 'Mocked response' }],
    // ... other response fields
  },
  interaction: {
    model: 'claude-3-5-sonnet-20241022',
    tokensUsed: { prompt: 10, completion: 20, total: 30 },
    // ... other interaction fields
  }
});
```

### Integration Tests

For integration tests that actually call Claude, use the `.integration.test.ts` suffix and environment guards:

```typescript
describe('Claude Integration', () => {
  beforeAll(() => {
    if (!process.env.ANTHROPIC_API_KEY) {
      console.log('Skipping integration test - no API key');
      return;
    }
  });

  test('should analyze text', async () => {
    const { response, interaction } = await callClaude({
      messages: [{ role: "user", content: "Hello" }],
      max_tokens: 10
    });
    
    expect(response.content).toHaveLength(1);
    expect(interaction.tokensUsed.total).toBeGreaterThan(0);
  });
});
```

## Common Patterns

### 1. Document Analysis

```typescript
export async function analyzeDocument(content: string) {
  const llmInteractions: RichLLMInteraction[] = [];
  
  const { toolResult } = await callClaudeWithTool<{
    summary: string;
    keyPoints: string[];
    sentiment: 'positive' | 'negative' | 'neutral';
  }>({
    system: "You are a document analysis expert.",
    messages: [{
      role: "user",
      content: `Analyze this document:\n\n${content}`
    }],
    toolName: "analyze_document",
    toolDescription: "Provide document analysis",
    toolSchema: {
      type: "object",
      properties: {
        summary: { type: "string" },
        keyPoints: { type: "array", items: { type: "string" } },
        sentiment: { type: "string", enum: ["positive", "negative", "neutral"] }
      },
      required: ["summary", "keyPoints", "sentiment"]
    }
  }, llmInteractions);
  
  return {
    analysis: toolResult,
    llmInteractions
  };
}
```

### 2. Multi-Step Processing

```typescript
export async function processWithFeedback(
  initialContent: string,
  feedbackRounds: number = 2
) {
  const llmInteractions: RichLLMInteraction[] = [];
  let currentContent = initialContent;
  
  for (let round = 0; round < feedbackRounds; round++) {
    const { response } = await callClaude({
      messages: [{
        role: "user",
        content: `Improve this content (round ${round + 1}):\n\n${currentContent}`
      }],
      system: "You are an editor. Improve the content quality."
    }, llmInteractions);
    
    currentContent = response.content[0].text;
  }
  
  return {
    finalContent: currentContent,
    totalTokens: llmInteractions.reduce((sum, i) => sum + i.tokensUsed.total, 0),
    llmInteractions
  };
}
```

### 3. Conditional Routing

```typescript
export async function routeToPlugin(chunk: TextChunk) {
  const { response } = await callClaude({
    model: MODEL_CONFIG.routing,  // Use fast model
    messages: [{
      role: "user",
      content: `Should this text be fact-checked? Reply YES or NO only:\n\n${chunk.text}`
    }],
    max_tokens: 10,
    temperature: 0
  });
  
  const shouldFactCheck = response.content[0].text.trim().toUpperCase() === 'YES';
  return shouldFactCheck;
}
```

## Performance Considerations

1. **Batch Operations**: When possible, batch multiple items into a single call
2. **Model Selection**: Use Haiku for simple decisions, Sonnet for complex analysis
3. **Token Limits**: Be mindful of token limits and costs
4. **Caching**: Consider caching responses for identical inputs
5. **Streaming**: The wrapper doesn't support streaming; use direct client if needed

## Future Enhancements

Potential improvements to the wrapper pattern:

1. **Response Streaming**: Add streaming support for real-time responses
2. **Retry Logic**: Built-in exponential backoff for transient failures
3. **Response Caching**: Optional caching layer for identical requests
4. **Usage Analytics**: Enhanced tracking and reporting of usage patterns
5. **Model Fallbacks**: Automatic fallback to alternative models on failure

## Summary

The Claude wrapper pattern simplifies LLM interactions while providing consistent tracking, error handling, and type safety. Always use this wrapper instead of direct Anthropic client calls to ensure proper integration with our monitoring and analytics systems.