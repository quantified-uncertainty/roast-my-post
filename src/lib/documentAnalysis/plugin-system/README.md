# Plugin-Based Document Analysis System

A modular document analysis system that uses LLM-based routing to direct text chunks to appropriate analysis plugins.

## Recent Refactoring (2025)

The plugin system has been significantly refactored to simplify the API and improve maintainability:

### Key Improvements
- **Simplified API**: New `SimpleAnalysisPlugin` interface with single `analyze()` method
- **Modular structure**: Each plugin in its own directory with clear separation of concerns
- **50-70% code reduction** through elimination of duplicate patterns
- **Automatic location tracking** for all findings
- **Standardized error analysis** and recommendation generation
- **Type-safe state management** with helper methods

## Overview

The system works as follows:
1. **Chunking**: Documents are split into manageable chunks
2. **Routing**: An LLM (Claude Haiku) reads plugin descriptions and decides which plugins should process each chunk
3. **Analysis**: Each plugin's `analyze()` method processes all assigned chunks and returns complete results
4. **Results**: Plugins return summary, analysis markdown, comments with exact locations, LLM interactions, and costs

## Architecture

### New Structure
```
plugin-system/
├── core/
│   └── BasePlugin.ts           # Base class for backwards compatibility
├── utils/
│   ├── extractionHelper.ts     # LLM extraction utilities
│   ├── pluginHelpers.ts        # Comment generation, location tracking
│   └── findingHelpers.ts       # Finding ID generation, utilities
├── types.ts                    # Core types including SimpleAnalysisPlugin
└── plugins/
    ├── math/                   # Mathematics verification plugin
    │   ├── index.ts           # Main plugin implementation
    │   ├── types.ts           # Plugin-specific types
    │   ├── promptBuilder.ts   # Math-specific prompts
    │   └── errorAnalyzer.ts   # Pattern analysis
    ├── spelling/              # Spelling & grammar plugin
    │   ├── index.ts
    │   ├── types.ts
    │   ├── promptBuilder.ts
    │   └── errorAnalyzer.ts
    ├── factCheck/             # Fact checking plugin
    │   └── index.ts           # Single file for simpler plugins
    └── forecast/              # Prediction extraction plugin
        └── index.ts
```

## Key Components

### Migration from Legacy to SimpleAnalysisPlugin

The plugin system has evolved from a multi-stage process to a simplified single-method approach:

**Legacy API (deprecated)**:
- `processChunk()` - Process each chunk individually
- `synthesize()` - Synthesize findings after all chunks
- `generateComments()` - Generate UI comments

**New SimpleAnalysisPlugin API**:
- `analyze()` - Single method that handles everything internally

The new API encapsulates all the stages internally, making plugins easier to write and understand.

### SimpleAnalysisPlugin Interface

The new simplified plugin interface requires only essential methods:

```typescript
interface SimpleAnalysisPlugin {
  // Metadata
  name(): string;                    // e.g., "MATH", "SPELLING"
  promptForWhenToUse(): string;      // Natural language description for routing
  routingExamples?(): RoutingExample[]; // Optional examples to improve routing
  
  // Core workflow - single method that handles everything
  analyze(chunks: TextChunk[], documentText: string): Promise<AnalysisResult>;
  
  // For testing/debugging
  getDebugInfo?(): any;
  getCost(): number;
  getLLMInteractions(): LLMInteraction[];
}

// The analyze method returns everything needed
interface AnalysisResult {
  summary: string;                   // Brief summary
  analysis: string;                  // Markdown analysis
  comments: Comment[];               // UI comments with locations
  llmInteractions: LLMInteraction[]; // All LLM calls made
  cost: number;                      // Total cost
}
```

### Plugin Implementation Pattern

Here's how modern plugins are implemented using the new API:

```typescript
import { BasePlugin } from "../../core/BasePlugin";
import { SimpleAnalysisPlugin, AnalysisResult, TextChunk } from "../../types";
import { extractWithTool } from "../../utils/extractionHelper";
import { locateFindings, generateCommentsFromFindings } from "../../utils/pluginHelpers";

export class SpellingPlugin extends BasePlugin<{}> implements SimpleAnalysisPlugin {
  private findings: {
    potential: PotentialFinding[];
    investigated: InvestigatedFinding[];
    located: LocatedFinding[];
    summary?: string;
    analysisSummary?: string;
  } = { potential: [], investigated: [], located: [] };
  
  private analysisInteractions: LLMInteraction[] = [];

  name(): string {
    return "SPELLING";
  }

  promptForWhenToUse(): string {
    return `Call this for ALL text chunks to check spelling, grammar, and style...`;
  }

  async analyze(chunks: TextChunk[], documentText: string): Promise<AnalysisResult> {
    // Clear any previous state
    this.clearState();
    
    // Stage 1: Extract findings from all chunks
    for (const chunk of chunks) {
      await this.extractPotentialFindings(chunk);
    }
    
    // Stage 2: Investigate findings (add severity/messages)
    this.investigateFindings();
    
    // Stage 3: Locate findings in document
    this.locateFindings(documentText);
    
    // Stage 4: Analyze patterns
    this.analyzeFindingPatterns();
    
    // Stage 5: Generate comments
    const comments = this.getComments(documentText);
    
    return {
      summary: this.findings.summary || "",
      analysis: this.findings.analysisSummary || "",
      comments,
      llmInteractions: this.analysisInteractions,
      cost: this.getTotalCost()
    };
  }
  
  // ... internal methods for each stage ...
}
```

### PromptBasedRouter
- Uses natural language plugin descriptions for routing decisions
- Batches chunks for efficient LLM calls
- Caches routing decisions for similar chunks
- **LLM Interaction Tracking**: All router LLM calls are tracked with tokens, timing, and costs
- Each plugin provides `name()` and `promptForWhenToUse()`


### Built-in Plugins

1. **MathPlugin** - Verifies mathematical expressions and calculations
2. **SpellingPlugin** - Checks spelling, grammar, and style
3. **FactCheckPlugin** - Extracts and verifies factual claims
4. **ForecastPlugin** - Finds predictions and generates forecasts

## Usage

```typescript
import { PluginManager } from './plugin-system';
import { MathPlugin } from './plugins/math';
import { SpellingPlugin } from './plugins/spelling';
import { FactCheckPlugin } from './plugins/fact-check';
import { ForecastPlugin } from './plugins/forecast';

// Create manager
const manager = new PluginManager();

// Create plugin instances
const plugins = [
  new MathPlugin(),
  new SpellingPlugin(),
  new FactCheckPlugin(),
  new ForecastPlugin()
];

// Analyze document
const results = await manager.analyzeDocumentSimple(documentText, plugins);

// Access results
console.log(results.summary);
console.log(results.analysis);
console.log(results.statistics);
console.log(results.allComments);

// Access individual plugin results
results.pluginResults.forEach((result, pluginName) => {
  console.log(`${pluginName}:`);
  console.log(`  - Summary: ${result.summary}`);
  console.log(`  - Comments: ${result.comments.length}`);
  console.log(`  - Cost: $${result.cost.toFixed(4)}`);
});

// Access router LLM interactions for monitoring
const routerInteractions = manager.getRouterLLMInteractions();
console.log(`Router made ${routerInteractions.length} LLM calls`);
routerInteractions.forEach(interaction => {
  console.log(`- ${interaction.model}: ${interaction.tokensUsed.total} tokens in ${interaction.duration}ms`);
});
```

## Creating Custom Plugins

### Directory Structure for New Plugins

Each plugin should be organized in its own directory:

```
plugins/
└── myPlugin/
    ├── index.ts           # Main plugin implementation
    ├── types.ts           # Plugin-specific types and schemas
    ├── promptBuilder.ts   # Prompt generation logic
    └── analyzer.ts        # Pattern analysis (if needed)
```

### Implementing a Custom Plugin

```typescript
// plugins/myPlugin/index.ts
import { BasePlugin } from '../../core/BasePlugin';
import { SimpleAnalysisPlugin, AnalysisResult, TextChunk } from '../../types';
import { extractWithTool } from '../../utils/extractionHelper';
import { locateFindings, generateCommentsFromFindings } from '../../utils/pluginHelpers';
import { MyPromptBuilder } from './promptBuilder';
import { getMyExtractionConfig } from './types';

export class MyPlugin extends BasePlugin<{}> implements SimpleAnalysisPlugin {
  private findings = {
    potential: [],
    investigated: [],
    located: [],
    summary: '',
    analysisSummary: ''
  };
  private analysisInteractions: LLMInteraction[] = [];

  name(): string {
    return "MY_PLUGIN";
  }

  promptForWhenToUse(): string {
    return `Call this plugin when you see specific patterns that need analysis.
    This includes:
    - Pattern type 1
    - Pattern type 2`;
  }

  routingExamples() {
    return [
      {
        chunkText: "Example text that should be processed",
        shouldProcess: true,
        reason: "Contains pattern type 1"
      },
      {
        chunkText: "Example text to skip",
        shouldProcess: false,
        reason: "No relevant patterns"
      }
    ];
  }

  async analyze(chunks: TextChunk[], documentText: string): Promise<AnalysisResult> {
    // Clear state
    this.clearState();
    
    // Stage 1: Extract findings from chunks
    for (const chunk of chunks) {
      const extraction = await extractWithTool(chunk, {
        ...getMyExtractionConfig(),
        extractionPrompt: new MyPromptBuilder().buildExtractionPrompt(chunk)
      });
      
      this.analysisInteractions.push(extraction.interaction);
      this.totalCost += extraction.cost;
      
      // Convert to findings
      const findings = this.convertToFindings(extraction.result, chunk.id);
      this.findings.potential.push(...findings);
    }
    
    // Stage 2: Investigate (add severity and messages)
    this.findings.investigated = this.findings.potential.map(f => ({
      ...f,
      severity: this.determineSeverity(f),
      message: this.createMessage(f)
    }));
    
    // Stage 3: Locate in document
    const { located, dropped } = locateFindings(
      this.findings.investigated,
      documentText
    );
    this.findings.located = located;
    
    // Stage 4: Analyze patterns
    this.analyzePatterns();
    
    // Stage 5: Generate comments
    const comments = generateCommentsFromFindings(
      this.findings.located,
      documentText
    );
    
    return {
      summary: this.findings.summary,
      analysis: this.findings.analysisSummary,
      comments,
      llmInteractions: this.analysisInteractions,
      cost: this.getTotalCost()
    };
  }
  
  getCost(): number {
    return this.getTotalCost();
  }
  
  getDebugInfo() {
    return {
      findings: this.findings,
      stats: {
        potential: this.findings.potential.length,
        located: this.findings.located.length
      }
    };
  }
  
  // ... private helper methods ...
}
```

### Internal Processing Stages

While the public API is simple, plugins typically follow these internal stages:

1. **Extract**: Use LLM to extract potential findings from chunks
2. **Investigate**: Add severity levels and user-friendly messages
3. **Locate**: Find exact character positions in the document
4. **Analyze**: Identify patterns and generate summaries
5. **Generate**: Create UI comments with precise locations

Each stage uses shared utilities from `/utils` to ensure consistency across all plugins.

## Key Benefits of the New Architecture

1. **Simplified API**: Single `analyze()` method handles all processing stages
2. **Modular Organization**: Each plugin in its own directory with clear separation of concerns
3. **Efficiency**: Smart routing avoids unnecessary processing
4. **Transparency**: All LLM interactions and costs are tracked
5. **Natural Language Routing**: Plugin capabilities described in plain English
6. **Automatic Location Tracking**: All findings get line numbers automatically
7. **Consistent Patterns**: Same approach for all plugins using shared utilities
8. **Type Safety**: Strong TypeScript support throughout
9. **No Code Duplication**: Shared utilities in `/utils` folder
10. **Easy Testing**: Built-in `getDebugInfo()` for introspection

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