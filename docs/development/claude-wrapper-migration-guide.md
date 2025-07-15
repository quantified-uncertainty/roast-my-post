# Claude Wrapper Migration Guide

This guide helps you migrate from direct Anthropic client usage to the centralized Claude wrapper pattern.

## Quick Reference

| Old Pattern | New Pattern |
|-------------|-------------|
| `createAnthropicClient()` | `callClaude()` |
| Manual interaction tracking | Automatic tracking |
| Manual token counting | Automatic counting |
| Direct error handling | Standardized errors |
| Manual Helicone setup | Built-in integration |

## Step-by-Step Migration

### 1. Find Direct Client Usage

Search for these patterns in your code:
- `createAnthropicClient`
- `anthropic.messages.create`
- `new Anthropic(`
- Direct imports from `@anthropic-ai/sdk`

### 2. Replace Basic Calls

**Before:**
```typescript
import { createAnthropicClient } from '@/types/openai';

async function analyzeText(text: string) {
  const anthropic = createAnthropicClient();
  
  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1000,
    temperature: 0,
    messages: [{
      role: "user",
      content: `Analyze: ${text}`
    }]
  });
  
  return response.content[0].text;
}
```

**After:**
```typescript
import { callClaude } from '@/lib/claude/wrapper';

async function analyzeText(text: string) {
  const { response } = await callClaude({
    messages: [{
      role: "user",
      content: `Analyze: ${text}`
    }],
    max_tokens: 1000,
    temperature: 0
  });
  
  return response.content[0].text;
}
```

### 3. Migrate Interaction Tracking

**Before:**
```typescript
const startTime = Date.now();
const response = await anthropic.messages.create({ /* ... */ });

const interaction: RichLLMInteraction = {
  model: 'claude-3-5-sonnet-20241022',
  prompt: buildPromptString(system, messages),
  response: JSON.stringify(response.content),
  tokensUsed: {
    prompt: response.usage.input_tokens,
    completion: response.usage.output_tokens,
    total: response.usage.input_tokens + response.usage.output_tokens
  },
  timestamp: new Date(),
  duration: Date.now() - startTime
};

llmInteractions.push(interaction);
```

**After:**
```typescript
const llmInteractions: RichLLMInteraction[] = [];

const { response, interaction } = await callClaude({
  system,
  messages,
  /* other options */
}, llmInteractions); // Automatically pushed to array!
```

### 4. Migrate Tool Use

**Before:**
```typescript
const response = await anthropic.messages.create({
  model: 'claude-3-5-sonnet-20241022',
  messages: [{ role: "user", content: prompt }],
  tools: [{
    name: "analyze",
    description: "Analyze the text",
    input_schema: {
      type: "object",
      properties: {
        errors: { type: "array", /* ... */ }
      }
    }
  }],
  tool_choice: { type: "tool", name: "analyze" }
});

// Extract tool result manually
const toolBlock = response.content.find(c => c.type === "tool_use");
const result = toolBlock?.input;
```

**After:**
```typescript
const { toolResult } = await callClaudeWithTool<AnalysisResult>({
  messages: [{ role: "user", content: prompt }],
  toolName: "analyze",
  toolDescription: "Analyze the text",
  toolSchema: {
    type: "object",
    properties: {
      errors: { type: "array", /* ... */ }
    }
  }
});

// Direct access to typed result!
const errors = toolResult.errors;
```

### 5. Update Model References

**Before:**
```typescript
const ANALYSIS_MODEL = 'claude-3-5-sonnet-20241022';
const FAST_MODEL = 'claude-3-haiku-20240307';

// Scattered throughout code
await anthropic.messages.create({
  model: ANALYSIS_MODEL,
  // ...
});
```

**After:**
```typescript
import { MODEL_CONFIG } from '@/lib/claude/wrapper';

await callClaude({
  model: MODEL_CONFIG.analysis,  // or .routing, .forecasting
  // ...
});
```

### 6. Update Error Handling

**Before:**
```typescript
try {
  const response = await anthropic.messages.create({ /* ... */ });
  // Handle response
} catch (error) {
  if (error instanceof Anthropic.APIError) {
    console.error('API error:', error.status, error.message);
  } else {
    console.error('Unknown error:', error);
  }
}
```

**After:**
```typescript
try {
  const { response } = await callClaude({ /* ... */ });
  // Handle response
} catch (error) {
  // Standardized error handling
  console.error('Claude API error:', error);
}
```

## Common Migration Patterns

### Pattern 1: Router/Decision Making

**Before:**
```typescript
const anthropic = createAnthropicClient();
const response = await anthropic.messages.create({
  model: 'claude-3-haiku-20240307',
  max_tokens: 10,
  temperature: 0,
  messages: [{
    role: "user",
    content: "Should this be fact-checked? YES/NO"
  }]
});
const decision = response.content[0].text.trim();
```

**After:**
```typescript
import { callClaude, MODEL_CONFIG } from '@/lib/claude/wrapper';

const { response } = await callClaude({
  model: MODEL_CONFIG.routing,
  max_tokens: 10,
  temperature: 0,
  messages: [{
    role: "user",
    content: "Should this be fact-checked? YES/NO"
  }]
});
const decision = response.content[0].text.trim();
```

### Pattern 2: Complex Analysis with Tracking

**Before:**
```typescript
export async function complexAnalysis(doc: Document) {
  const interactions: RichLLMInteraction[] = [];
  const anthropic = createAnthropicClient();
  
  // First analysis
  const start1 = Date.now();
  const response1 = await anthropic.messages.create({ /* ... */ });
  interactions.push({
    model: 'claude-3-5-sonnet-20241022',
    prompt: /* ... */,
    response: JSON.stringify(response1.content),
    tokensUsed: { /* manual calculation */ },
    timestamp: new Date(),
    duration: Date.now() - start1
  });
  
  // Second analysis
  const start2 = Date.now();
  const response2 = await anthropic.messages.create({ /* ... */ });
  interactions.push({ /* similar tracking */ });
  
  return { response1, response2, interactions };
}
```

**After:**
```typescript
export async function complexAnalysis(doc: Document) {
  const llmInteractions: RichLLMInteraction[] = [];
  
  // First analysis - tracking is automatic
  const { response: response1 } = await callClaude({
    /* options */
  }, llmInteractions);
  
  // Second analysis - tracking is automatic
  const { response: response2 } = await callClaude({
    /* options */
  }, llmInteractions);
  
  return { response1, response2, llmInteractions };
}
```

## Testing Migration

### Update Mock Imports

**Before:**
```typescript
jest.mock('@/types/openai', () => ({
  createAnthropicClient: jest.fn(() => ({
    messages: {
      create: jest.fn()
    }
  }))
}));
```

**After:**
```typescript
jest.mock('@/lib/claude/wrapper');
import { callClaude } from '@/lib/claude/wrapper';
const mockCallClaude = callClaude as jest.MockedFunction<typeof callClaude>;
```

### Update Test Assertions

**Before:**
```typescript
const mockCreate = jest.fn().mockResolvedValue({
  content: [{ type: 'text', text: 'response' }],
  usage: { input_tokens: 10, output_tokens: 20 }
});
```

**After:**
```typescript
mockCallClaude.mockResolvedValue({
  response: {
    content: [{ type: 'text', text: 'response' }],
    // other fields
  },
  interaction: {
    tokensUsed: { prompt: 10, completion: 20, total: 30 },
    // other fields
  }
});
```

## Checklist

- [ ] Search for all `createAnthropicClient` usages
- [ ] Replace with `callClaude` or `callClaudeWithTool`
- [ ] Remove manual interaction tracking code
- [ ] Update model references to use `MODEL_CONFIG`
- [ ] Simplify error handling
- [ ] Update tests to mock the wrapper
- [ ] Remove unused imports from `@anthropic-ai/sdk`
- [ ] Test that token tracking still works
- [ ] Verify Helicone integration is working

## Benefits After Migration

1. **Cleaner Code**: Less boilerplate, more focused on business logic
2. **Automatic Tracking**: No manual token counting or timing
3. **Type Safety**: Better TypeScript support with tool use
4. **Consistency**: All Claude calls follow the same pattern
5. **Future-Proof**: Easy to add features like caching or retries
6. **Better Testing**: Simpler mocking and test setup

## Need Help?

- See [Claude Wrapper Pattern Documentation](./claude-wrapper-pattern.md) for detailed usage
- Check existing migrations in the codebase for examples
- Look at test files for mocking patterns