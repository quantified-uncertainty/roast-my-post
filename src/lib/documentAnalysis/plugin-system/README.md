# Plugin-Based Document Analysis System

A modular document analysis system that uses LLM-based routing to direct text chunks to appropriate analysis plugins.

## Recent Refactoring (2025)

The plugin system has been significantly refactored to eliminate code duplication and improve maintainability:

### Key Improvements
- **50-70% code reduction** through elimination of duplicate patterns
- **Unified base class** combining best features from previous implementations  
- **Automatic location tracking** for all findings
- **Standardized error analysis** and recommendation generation
- **Fluent builders** for consistent object creation
- **Type-safe state management** with helper methods

## Overview

The system works in several phases:
1. **Chunking**: Documents are split into manageable chunks
2. **Routing**: An LLM (Claude Haiku) reads plugin descriptions and decides which plugins should process each chunk
3. **Processing**: Plugins process their assigned chunks, storing LocatedFindings with location info
4. **Comment Generation**: Plugins convert located findings to UI comments with exact character offsets
5. **Synthesis**: Plugins synthesize patterns into analysis summaries (Markdown)

## Architecture

### New Structure
```
plugin-system/
├── core/
│   └── BasePlugin.ts          # Unified base class with all features
├── mixins/
│   └── LocationTracking.ts    # Automatic location tracking
├── builders/
│   ├── FindingBuilder.ts      # Fluent finding creation
│   ├── SchemaBuilder.ts       # Tool schema generation
│   └── PromptBuilder.ts       # Domain-specific prompts
├── analyzers/
│   └── ErrorPatternAnalyzer.ts # Generic pattern analysis
├── engines/
│   └── RecommendationEngine.ts # Rule-based recommendations
└── plugins/
    ├── SpellingPlugin.ts      # Refactored plugins
    ├── FactCheckPlugin.ts
    ├── MathPlugin.ts
    └── ForecastPlugin.ts
```

## Key Components

### BasePlugin (Unified)

The new `BasePlugin` class provides:
- Built-in LLM interaction tracking
- Automatic cost calculation
- Tool-based extraction utilities
- State management helpers
- Session context support

```typescript
// Example of new simplified plugin
class MyPlugin extends BasePlugin<MyState> {
  async processChunk(chunk: TextChunk): Promise<ChunkResult> {
    // Use built-in extraction with automatic tracking
    const { result, cost } = await this.extractWithTool(
      chunk,
      "extract_items",
      "Extract relevant items",
      SchemaBuilder.extraction("item", { /* properties */ })
    );
    
    // Create LocatedFindings with automatic location tracking
    const findings = result.items.map(item => {
      const finding = FindingBuilder
        .forError('type', item.text, 'Description')
        .inChunk(chunk)
        .build();
      
      // Store as LocatedFinding if location found
      if (finding.locationHint) {
        this.addLocatedFindings([{
          ...finding,
          locationHint: finding.locationHint
        }]);
      }
      return finding;
    });
    
    return { findings, llmCalls: this.getLLMInteractions() };
  }
  
  // Convert stored LocatedFindings to UI comments
  generateComments(context: GenerateCommentsContext): Comment[] {
    return super.generateComments(context);
  }
  
  // Synthesize patterns into analysis summary
  async synthesize(): Promise<SynthesisResult> {
    return {
      summary: "Brief summary",
      analysisSummary: "## Analysis\n\nMarkdown analysis...",
      recommendations: [],
      llmCalls: []
    };
  }
}
```

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
  generateComments(context: GenerateCommentsContext): Comment[];
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

// Access plugin comments
results.pluginComments.forEach((comments, pluginName) => {
  console.log(`${pluginName} generated ${comments.length} comments`);
});

// Access router LLM interactions for monitoring
const routerInteractions = manager.getRouterLLMInteractions();
console.log(`Router made ${routerInteractions.length} LLM calls`);
routerInteractions.forEach(interaction => {
  console.log(`- ${interaction.model}: ${interaction.tokensUsed.total} tokens in ${interaction.duration}ms`);
});
```

## Creating Custom Plugins

### Using the New Architecture

```typescript
import { BasePlugin } from './core/BasePlugin';
import { FindingBuilder } from './builders/FindingBuilder';
import { SchemaBuilder } from './builders/SchemaBuilder';
import { PromptBuilder } from './builders/PromptBuilder';
import { ErrorPatternAnalyzer } from './analyzers/ErrorPatternAnalyzer';
import { RecommendationEngine } from './engines/RecommendationEngine';

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
    // Use built-in extraction
    const { result, cost } = await this.extractWithTool(
      chunk,
      "extract_custom",
      "Extract custom content",
      SchemaBuilder.extraction("item", {
        value: { type: "string" },
        isValid: { type: "boolean" }
      })
    );
    
    // Create findings with automatic location tracking
    const findings = result.items
      .filter(item => !item.isValid)
      .map(item => 
        FindingBuilder
          .error(`Invalid item: ${item.value}`, item.text)
          .inChunk(chunk)
          .withSeverity('medium')
          .build()
      );
    
    // Update state using helpers
    this.addToStateArray('items', result.items);
    
    return { 
      findings, 
      llmCalls: this.getLLMInteractions().slice(-1),
      metadata: { tokensUsed: cost }
    };
  }

  async synthesize(): Promise<SynthesisResult> {
    // Use analyzers for pattern detection
    const analyzer = new ErrorPatternAnalyzer({
      categories: {
        type1: ['keyword1', 'keyword2'],
        type2: ['keyword3', 'keyword4']
      }
    });
    
    const analysis = analyzer.analyze(this.state.errors);
    
    // Generate recommendations
    const engine = new RecommendationEngine()
      .addRule({
        condition: ctx => ctx.errorCount > 5,
        recommendation: 'Review all items carefully'
      });
    
    const recommendations = engine.generateRecommendations({
      errorCount: this.state.errors.length,
      patterns: analysis.patterns
    });
    
    return {
      summary: analysis.summary,
      analysisSummary: `## Analysis\n\n${analysis.details}`,
      recommendations,
      llmCalls: []
    };
  }
}
```

## Architecture Benefits

### Original Benefits (Maintained)
1. **Flexibility**: Easy to add new plugins without changing core code
2. **Efficiency**: Smart routing avoids unnecessary processing
3. **Transparency**: All LLM interactions are tracked
4. **Stateful**: Plugins can accumulate data across chunks
5. **Natural Language**: Plugin capabilities described in plain English

### New Benefits (After Refactoring)
6. **No Duplication**: Shared utilities eliminate repeated code
7. **Automatic Location Tracking**: All findings get line numbers automatically
8. **Consistent Patterns**: Same approach for error analysis across all plugins
9. **Type Safety**: Better TypeScript support with generics
10. **Fluent APIs**: Intuitive builder patterns for common tasks

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