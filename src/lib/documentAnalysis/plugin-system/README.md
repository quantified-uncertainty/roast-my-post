# Plugin-Based Document Analysis System

A modular document analysis system that uses LLM-based routing to direct text chunks to appropriate analysis plugins.

## Overview

The system works in several phases:
1. **Chunking**: Documents are split into manageable chunks
2. **Routing**: An LLM (Claude Haiku) reads plugin descriptions and decides which plugins should process each chunk
3. **Processing**: Plugins process their assigned chunks, storing state as needed
4. **Synthesis**: Plugins synthesize their findings into final results

## Key Components

### PromptBasedRouter
- Uses natural language plugin descriptions for routing decisions
- Batches chunks for efficient LLM calls
- Caches routing decisions for similar chunks
- **LLM Interaction Tracking**: All router LLM calls are tracked with tokens, timing, and costs
- Each plugin provides `name()` and `promptForWhenToUse()`

### Plugin Interface
```typescript
interface AnalysisPlugin<TState = any> {
  // Identity
  name(): string;  // e.g., "MATH", "FACT_CHECK"
  
  // Natural language description for routing
  promptForWhenToUse(): string;
  
  // Processing methods
  processChunk(chunk: TextChunk): Promise<ChunkResult>;
  synthesize(): Promise<SynthesisResult>;
  
  // State management
  getState(): TState;
  clearState(): void;
}
```

### Built-in Plugins

1. **MathPlugin** - Verifies mathematical expressions and calculations
2. **SpellingPlugin** - Checks spelling, grammar, and style
3. **FactCheckPlugin** - Extracts and verifies factual claims
4. **ForecastPlugin** - Finds predictions and generates forecasts

## Usage

```typescript
import { PluginManager, MathPlugin, SpellingPlugin } from './plugin-system';

// Create manager and register plugins
const manager = new PluginManager();
manager.registerPlugins([
  new MathPlugin(),
  new SpellingPlugin(),
  new FactCheckPlugin(),
  new ForecastPlugin()
]);

// Analyze document
const results = await manager.analyzeDocument(documentText, {
  chunkSize: 1000,
  chunkByParagraphs: true
});

// Access results
console.log(results.summary);
console.log(results.statistics);
console.log(results.recommendations);

// Access router LLM interactions for monitoring
const routerInteractions = manager.getRouterLLMInteractions();
console.log(`Router made ${routerInteractions.length} LLM calls`);
routerInteractions.forEach(interaction => {
  console.log(`- ${interaction.model}: ${interaction.tokensUsed.total} tokens in ${interaction.duration}ms`);
});
```

## Creating Custom Plugins

```typescript
import { BasePlugin } from './BasePlugin';

class CustomPlugin extends BasePlugin<MyState> {
  name(): string {
    return "CUSTOM";
  }

  promptForWhenToUse(): string {
    return `Call this when you see X, Y, or Z. This includes:
    - Specific pattern 1
    - Specific pattern 2`;
  }

  async processChunk(chunk: TextChunk): Promise<ChunkResult> {
    // Process chunk, update state
    // Return findings and LLM interactions
  }

  async synthesize(): Promise<SynthesisResult> {
    // Analyze accumulated state
    // Return summary, findings, and recommendations
  }
}
```

## Architecture Benefits

1. **Flexibility**: Easy to add new plugins without changing core code
2. **Efficiency**: Smart routing avoids unnecessary processing
3. **Transparency**: All LLM interactions are tracked
4. **Stateful**: Plugins can accumulate data across chunks
5. **Natural Language**: Plugin capabilities described in plain English

## Performance Optimizations

- Routing decisions are cached for similar chunks
- Chunks are processed in batches to minimize LLM calls
- Plugins only process relevant chunks
- Fast routing model (Haiku) for efficiency

## Testing

```bash
# Test routing system
npx tsx scripts/test-plugin-routing.ts

# Test router LLM tracking
npx tsx src/lib/documentAnalysis/plugin-system/test-router-tracking.ts

# Test full system
npx tsx scripts/test-plugin-system.ts
```

## LLM Interaction Monitoring

The system provides comprehensive tracking of all LLM interactions:

### Router-Level Tracking
- All routing decisions are tracked with detailed metrics
- Token usage (prompt + completion tokens)
- Response timing and timestamps
- Model information (typically claude-3-haiku-20240307)

### Integration with Analysis Pipeline
- Router interactions are included in final `TaskResult` objects
- Token costs are automatically calculated and included in statistics
- Monitoring systems can access routing metrics via `getRouterLLMInteractions()`

### Accessing Router Metrics
```typescript
// Get all router interactions
const interactions = pluginManager.getRouterLLMInteractions();

// Get the most recent router call
const lastCall = pluginManager.getLastRouterLLMInteraction();

// Clear tracking data (useful for fresh analysis)
pluginManager.clearRouterLLMInteractions();
```