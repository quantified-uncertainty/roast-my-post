# Prompt-Based Plugin Routing System

## Core Concept
Each plugin provides a name and a natural language description of when it should be used. A routing LLM decides which plugins to apply to each chunk.

## Plugin Interface

```typescript
interface AnalysisPlugin<TState = any> {
  // Identity
  name(): string;  // "MATH", "FACT_CHECK", "SPELLING", etc.
  
  // Natural language description for routing
  promptForWhenToUse(): string;
  
  // Optional: examples to improve routing accuracy
  routingExamples?(): RoutingExample[];
  
  // Processing methods
  processChunk(chunk: TextChunk): Promise<ChunkResult>;
  synthesize(): Promise<SynthesisResult>;
  
  // State management
  getState(): TState;
  clearState(): void;
}

interface RoutingExample {
  chunkText: string;
  shouldProcess: boolean;
  reason?: string;
}
```

## Example Plugin Implementations

```typescript
class MathPlugin implements AnalysisPlugin<MathState> {
  name(): string {
    return "MATH";
  }
  
  promptForWhenToUse(): string {
    return `Call this when there is math of any kind. This includes:
- Equations and formulas (2+2=4, E=mc², etc.)
- Statistical calculations or percentages
- Back-of-the-envelope calculations
- Mathematical reasoning or proofs
- Numerical comparisons (X is 3x larger than Y)
- Unit conversions
- Any discussion involving mathematical relationships`;
  }
  
  routingExamples(): RoutingExample[] {
    return [
      {
        chunkText: "The population grew by 15% over the last decade, from 1.2M to 1.38M",
        shouldProcess: true,
        reason: "Contains percentage calculation that should be verified"
      },
      {
        chunkText: "Mathematics has been called the language of the universe",
        shouldProcess: false,
        reason: "Discusses math conceptually but contains no actual math"
      }
    ];
  }
  
  // ... rest of implementation
}

class FactCheckPlugin implements AnalysisPlugin<FactCheckState> {
  name(): string {
    return "FACT_CHECK";
  }
  
  promptForWhenToUse(): string {
    return `Call this when there are factual claims that could be verified. This includes:
- Specific statistics or data points (GDP was $21T in 2023)
- Historical facts (The Berlin Wall fell in 1989)
- Scientific claims (Water boils at 100°C at sea level)
- Claims about current events or recent developments
- Statements about organizations, people, or places
- Any claim presented as objective fact
Do NOT call for: opinions, predictions, hypotheticals, or general statements`;
  }
  
  // ... rest of implementation
}

class ForecastingPlugin implements AnalysisPlugin<ForecastState> {
  name(): string {
    return "FORECAST";
  }
  
  promptForWhenToUse(): string {
    return `Call this when there are predictions or forecasts about the future. This includes:
- Explicit predictions (AGI will arrive by 2030)
- Probability estimates (70% chance of recession)
- Trend extrapolations (at this rate, we'll reach X by Y)
- Conditional forecasts (if X happens, then Y will follow)
- Timeline estimates (this will take 5-10 years)
- Future-oriented language (will, shall, by [year], within [timeframe])`;
  }
  
  // ... rest of implementation
}

class SpellingGrammarPlugin implements AnalysisPlugin<SpellingState> {
  name(): string {
    return "SPELLING";
  }
  
  promptForWhenToUse(): string {
    return `Call this for ALL text chunks to check spelling, grammar, and style. This is a basic check that should run on every chunk unless explicitly excluded.`;
  }
  
  // ... rest of implementation
}

class ArgumentStructurePlugin implements AnalysisPlugin {
  name(): string {
    return "ARGUMENT";
  }
  
  promptForWhenToUse(): string {
    return `Call this when text contains argumentative reasoning or logical claims. This includes:
- Causal claims (X causes Y, due to, because of, results in)
- Logical arguments (therefore, thus, it follows that, consequently)
- Evidence presentation (studies show, data indicates, research proves)
- Counterarguments (however, on the other hand, critics argue)
- Syllogistic reasoning (if A then B, A, therefore B)`;
  }
  
  // ... rest of implementation
}

class CitationPlugin implements AnalysisPlugin {
  name(): string {
    return "CITATION";
  }
  
  promptForWhenToUse(): string {
    return `Call this when text contains citations, references, or quotes. This includes:
- Academic citations ([1], (Smith, 2023))
- Footnotes or endnotes
- Direct quotes with attribution
- Bibliography or reference sections
- Claims that reference specific sources
- "According to..." statements`;
  }
  
  // ... rest of implementation
}
```

## Routing System

```typescript
class PromptBasedRouter {
  private routingModel: string = 'claude-3-haiku-20240307'; // Fast model for routing
  private availablePlugins: Map<string, AnalysisPlugin> = new Map();
  private routingCache: Map<string, string[]> = new Map();
  
  registerPlugin(plugin: AnalysisPlugin): void {
    this.availablePlugins.set(plugin.name(), plugin);
  }
  
  async routeChunks(chunks: TextChunk[]): Promise<RoutingPlan> {
    // Build routing prompt
    const routingPrompt = this.buildRoutingPrompt();
    
    // Process chunks in batches for efficiency
    const batchSize = 10;
    const routingPlan = new RoutingPlan();
    
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      const routingDecisions = await this.routeBatch(batch, routingPrompt);
      
      routingDecisions.forEach((decision, index) => {
        routingPlan.addRouting(batch[index].id, decision.plugins);
      });
    }
    
    return routingPlan;
  }
  
  private buildRoutingPrompt(): string {
    const pluginDescriptions = Array.from(this.availablePlugins.values())
      .map(plugin => `- ${plugin.name()}: ${plugin.promptForWhenToUse()}`)
      .join('\n\n');
    
    return `You are a routing system that determines which analysis tools should process each text chunk.

Available tools:
${pluginDescriptions}

For each chunk, return a JSON array of tool names that should process it.

Guidelines:
- Only select tools that are clearly relevant to the chunk content
- SPELLING should be applied to all chunks unless they are purely data/references
- Multiple tools can be applied to the same chunk
- If no tools apply (e.g., empty chunk), return an empty array
- Consider the cost of processing - only route to tools that will likely find something

Your response must be a JSON array with one element per chunk, like:
[["MATH", "FACT_CHECK"], ["SPELLING"], ["FORECAST", "SPELLING"]]`;
  }
  
  private async routeBatch(
    chunks: TextChunk[],
    systemPrompt: string
  ): Promise<RoutingDecision[]> {
    // Check cache first
    const uncachedChunks: TextChunk[] = [];
    const cachedResults: Map<number, string[]> = new Map();
    
    chunks.forEach((chunk, index) => {
      const cacheKey = this.getCacheKey(chunk);
      const cached = this.routingCache.get(cacheKey);
      if (cached) {
        cachedResults.set(index, cached);
      } else {
        uncachedChunks.push(chunk);
      }
    });
    
    if (uncachedChunks.length === 0) {
      return chunks.map((_, index) => ({
        chunkId: chunks[index].id,
        plugins: cachedResults.get(index)!
      }));
    }
    
    // Build user prompt with chunks
    const userPrompt = this.buildBatchPrompt(uncachedChunks);
    
    // Call routing model
    const response = await anthropic.messages.create({
      model: this.routingModel,
      max_tokens: 1000,
      temperature: 0,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }]
    });
    
    // Parse response
    const routingArrays = this.parseRoutingResponse(response);
    
    // Cache results
    uncachedChunks.forEach((chunk, index) => {
      const cacheKey = this.getCacheKey(chunk);
      this.routingCache.set(cacheKey, routingArrays[index]);
    });
    
    // Combine cached and new results
    const results: RoutingDecision[] = [];
    let uncachedIndex = 0;
    
    chunks.forEach((chunk, index) => {
      if (cachedResults.has(index)) {
        results.push({
          chunkId: chunk.id,
          plugins: cachedResults.get(index)!
        });
      } else {
        results.push({
          chunkId: chunk.id,
          plugins: routingArrays[uncachedIndex++]
        });
      }
    });
    
    return results;
  }
  
  private buildBatchPrompt(chunks: TextChunk[]): string {
    const chunkTexts = chunks.map((chunk, index) => 
      `Chunk ${index + 1}:\n${chunk.text.slice(0, 500)}${chunk.text.length > 500 ? '...' : ''}`
    ).join('\n\n---\n\n');
    
    return `Analyze these ${chunks.length} text chunks and determine which tools should process each one:\n\n${chunkTexts}`;
  }
  
  private parseRoutingResponse(response: any): string[][] {
    const content = response.content[0].text;
    
    try {
      // Try to parse as JSON array
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch (e) {
      // Fallback: extract arrays from text
      const matches = content.matchAll(/\[(.*?)\]/g);
      const results: string[][] = [];
      
      for (const match of matches) {
        const plugins = match[1]
          .split(',')
          .map(s => s.trim().replace(/["']/g, ''))
          .filter(s => this.availablePlugins.has(s));
        results.push(plugins);
      }
      
      return results;
    }
    
    throw new Error('Could not parse routing response');
  }
  
  private getCacheKey(chunk: TextChunk): string {
    // Simple hash of first 200 chars + metadata
    const textKey = chunk.text.slice(0, 200);
    const metadataKey = JSON.stringify(chunk.metadata || {});
    return `${textKey}::${metadataKey}`;
  }
}
```

## Enhanced Routing with Examples

```typescript
class ExampleEnhancedRouter extends PromptBasedRouter {
  private buildRoutingPrompt(): string {
    const pluginSections = Array.from(this.availablePlugins.values())
      .map(plugin => {
        let section = `- ${plugin.name()}: ${plugin.promptForWhenToUse()}`;
        
        // Add examples if available
        const examples = plugin.routingExamples?.() || [];
        if (examples.length > 0) {
          section += '\n  Examples:';
          examples.forEach(ex => {
            section += `\n    ${ex.shouldProcess ? '✓' : '✗'} "${ex.chunkText.slice(0, 100)}..."`;
            if (ex.reason) section += ` (${ex.reason})`;
          });
        }
        
        return section;
      })
      .join('\n\n');
    
    return `You are a routing system that determines which analysis tools should process each text chunk.

Available tools:
${pluginSections}

For each chunk, return a JSON array of tool names that should process it.
Consider the examples provided to understand edge cases.`;
  }
}
```

## Optimizations

### 1. Batching and Caching
```typescript
class OptimizedRouter extends PromptBasedRouter {
  private pendingChunks: Map<string, TextChunk> = new Map();
  private batchTimer: NodeJS.Timeout | null = null;
  private readonly BATCH_DELAY = 100; // ms
  private readonly MAX_BATCH_SIZE = 20;
  
  async routeChunk(chunk: TextChunk): Promise<string[]> {
    return new Promise((resolve) => {
      this.pendingChunks.set(chunk.id, chunk);
      
      // Store resolver for later
      this.resolvers.set(chunk.id, resolve);
      
      // Start or reset batch timer
      if (this.batchTimer) clearTimeout(this.batchTimer);
      
      if (this.pendingChunks.size >= this.MAX_BATCH_SIZE) {
        this.processPendingBatch();
      } else {
        this.batchTimer = setTimeout(() => {
          this.processPendingBatch();
        }, this.BATCH_DELAY);
      }
    });
  }
}
```

### 2. Confidence Scoring
```typescript
interface RoutingDecisionWithConfidence {
  chunkId: string;
  plugins: Array<{
    name: string;
    confidence: number;  // 0-1
  }>;
}

class ConfidenceRouter extends PromptBasedRouter {
  private buildRoutingPrompt(): string {
    return super.buildRoutingPrompt() + `

For each plugin you select, also provide a confidence score (0-10) indicating how likely the plugin is to find something useful.

Format your response as:
[
  [{"name": "MATH", "confidence": 9}, {"name": "SPELLING", "confidence": 7}],
  [{"name": "SPELLING", "confidence": 8}]
]`;
  }
  
  async routeWithThreshold(
    chunks: TextChunk[],
    minConfidence: number = 5
  ): Promise<RoutingPlan> {
    const decisions = await this.routeChunks(chunks);
    
    // Filter by confidence threshold
    const filtered = decisions.map(decision => ({
      ...decision,
      plugins: decision.plugins
        .filter(p => p.confidence >= minConfidence)
        .map(p => p.name)
    }));
    
    return filtered;
  }
}
```

### 3. Dynamic Plugin Loading
```typescript
class DynamicRouter extends PromptBasedRouter {
  private corePlugins: Set<string> = new Set(['SPELLING']);
  private specializedPlugins: Map<string, () => AnalysisPlugin> = new Map();
  
  async routeDocument(document: Document): Promise<RoutingPlan> {
    // First pass: route with core plugins only
    const coreRouting = await this.routeChunks(document.chunks);
    
    // Analyze what specialized plugins might be needed
    const neededSpecializedPlugins = await this.determineSpecializedPlugins(
      document,
      coreRouting
    );
    
    // Load specialized plugins
    for (const pluginName of neededSpecializedPlugins) {
      const loader = this.specializedPlugins.get(pluginName);
      if (loader && !this.availablePlugins.has(pluginName)) {
        const plugin = loader();
        this.registerPlugin(plugin);
      }
    }
    
    // Second pass: route with all plugins
    if (neededSpecializedPlugins.size > 0) {
      return await this.routeChunks(document.chunks);
    }
    
    return coreRouting;
  }
}
```

## Usage Example

```typescript
// Initialize router and plugins
const router = new PromptBasedRouter();

router.registerPlugin(new SpellingGrammarPlugin());
router.registerPlugin(new MathPlugin());
router.registerPlugin(new FactCheckPlugin());
router.registerPlugin(new ForecastingPlugin());
router.registerPlugin(new ArgumentStructurePlugin());

// Process document
const document = await loadDocument('paper.pdf');
const chunks = createChunks(document);

// Route chunks to plugins
const routingPlan = await router.routeChunks(chunks);

// Execute plan
for (const [chunkId, pluginNames] of routingPlan) {
  const chunk = chunks.find(c => c.id === chunkId);
  
  for (const pluginName of pluginNames) {
    const plugin = router.getPlugin(pluginName);
    await plugin.processChunk(chunk);
  }
}

// Synthesize results
const results = await Promise.all(
  Array.from(router.getAllPlugins()).map(plugin => plugin.synthesize())
);
```

## Benefits

1. **Natural Language Flexibility**: Plugins describe capabilities in plain language
2. **Easy to Add Plugins**: Just implement name() and promptForWhenToUse()
3. **Centralized Routing Logic**: One LLM call routes multiple chunks
4. **Batching Efficiency**: Process multiple chunks in one API call
5. **Caching**: Similar chunks get same routing
6. **Examples for Edge Cases**: Plugins can provide examples to improve routing
7. **No ML Model Training**: Works immediately with any new plugin
8. **Dynamic Updates**: Can add/remove plugins at runtime

## Potential Improvements

1. **Few-Shot Learning**: Include example chunks and correct routings in prompt
2. **Feedback Loop**: Track which routings were productive and include in future prompts
3. **Hierarchical Routing**: Route to categories first, then specific plugins
4. **Cost Optimization**: Track token usage and optimize prompt length
5. **Parallel Routing**: Use multiple routing models for different plugin categories