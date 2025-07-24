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

### With Intelligent Chunking

The plugin system now supports intelligent document chunking using our advanced chunking tool:

```typescript
import { PluginManager } from './PluginManager';
import { ForecastPlugin } from './plugins/forecast';

// Create plugin manager with intelligent chunking enabled
const manager = new PluginManager({
  useIntelligentChunking: true,
  chunkingStrategy: 'markdown', // 'semantic' | 'fixed' | 'paragraph' | 'markdown' | 'hybrid'
});

// The plugins will receive intelligently chunked text
const result = await manager.analyzeDocumentSimple(
  documentText,
  [new ForecastPlugin()]
);
```

### Chunking Strategies

- **`hybrid`** (default): Automatically selects the best strategy based on document structure
- **`markdown`**: Preserves markdown structure, ideal for technical documentation
- **`semantic`**: Splits by sentences while maintaining context
- **`paragraph`**: Splits by paragraphs, good for essays
- **`fixed`**: Fixed-size chunks with overlap

### Benefits of Intelligent Chunking

1. **Better Context Preservation**: Chunks maintain semantic boundaries
2. **Markdown Awareness**: Code blocks and headers stay intact
3. **Optimal Sizing**: Chunks are sized appropriately for LLM analysis
4. **Metadata Rich**: Each chunk includes heading context and type information

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