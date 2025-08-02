# Plugin System Documentation

## Overview

The plugin system provides a modular architecture for analyzing documents with various specialized AI tools. Each plugin focuses on a specific type of analysis (forecasts, math, facts, etc.) and can be composed together.

## Using the Plugin System

### Basic Usage

```typescript
import { PluginManager } from './PluginManager';
import { ForecastPlugin } from './plugins/forecast';

// Create plugin manager
const manager = new PluginManager();

// Analyze with plugins
const result = await manager.analyzeDocumentSimple(
  documentText,
  [new ForecastPlugin()]
);
```

### Chunking Strategy

The plugin system automatically uses intelligent semantic chunking to ensure:
- Words are never split across chunk boundaries
- Sentences remain intact when possible  
- Chunks are sized appropriately for LLM analysis (~1500 characters)
- Code blocks and important structures are preserved

```typescript
import { PluginManager } from './PluginManager';
import { ForecastPlugin } from './plugins/forecast';

// Create plugin manager - intelligent chunking is always enabled
const manager = new PluginManager({
  sessionConfig: mySessionConfig,  // Optional Helicone session config
  jobId: myJobId,                  // Optional job ID for logging
});

// The plugins will receive properly chunked text
const result = await manager.analyzeDocumentSimple(
  documentText,
  [new ForecastPlugin()]
);
```

## Creating a Plugin

Plugins implement the `SimpleAnalysisPlugin` interface:

```typescript
export interface SimpleAnalysisPlugin {
  name(): string;
  promptForWhenToUse(): string;
  routingExamples(): RoutingExample[];
  analyze(chunks: TextChunk[], documentText: string): Promise<AnalysisResult>;
}
```

See existing plugins in `./plugins/` for examples.