# Chunk Routing Strategies for Plugin Architecture

## The Problem with `canProcess()`

The simple `canProcess(chunk: TextChunk): boolean` approach has several limitations:

1. **Inefficient**: Every plugin must examine every chunk
2. **Redundant**: Multiple plugins might do similar pattern matching
3. **Limited Context**: Decision based only on individual chunk content
4. **No Coordination**: Plugins can't coordinate to avoid duplicate work
5. **No Learning**: Can't improve routing based on past performance

## Better Approaches

### 1. Declarative Pattern Registration
Plugins declare what patterns they're interested in upfront.

```typescript
interface PluginRegistration {
  id: string;
  name: string;
  
  // Declarative patterns
  patterns: {
    required?: PatternMatcher[];  // Must match at least one
    optional?: PatternMatcher[];  // Nice to have
    exclude?: PatternMatcher[];   // Don't process if matches
  };
  
  // Semantic interests
  interests: {
    topics?: string[];           // "mathematics", "science", "politics"
    documentTypes?: string[];    // "research_paper", "news_article"
    sections?: string[];         // "methodology", "results", "claims"
    complexity?: 'low' | 'medium' | 'high';
  };
}

interface PatternMatcher {
  type: 'regex' | 'keywords' | 'nlp' | 'custom';
  value: any;
  confidence?: number;  // How confident we need to be
}

// Example registration
const mathPlugin: PluginRegistration = {
  id: 'math-checker',
  name: 'Mathematics Verification',
  patterns: {
    required: [
      { type: 'regex', value: /\d+\s*[\+\-\*/=]\s*\d+/ },
      { type: 'regex', value: /\\[a-zA-Z]+/ },  // LaTeX
      { type: 'keywords', value: ['equation', 'formula', 'calculate', 'proof'] }
    ],
    exclude: [
      { type: 'keywords', value: ['metaphorically', 'figuratively'] }
    ]
  },
  interests: {
    topics: ['mathematics', 'physics', 'engineering'],
    documentTypes: ['research_paper', 'textbook'],
    sections: ['methodology', 'results', 'appendix']
  }
};
```

### 2. Centralized Routing Engine
A smart router that learns and optimizes routing decisions.

```typescript
class SmartRouter {
  private classifier: ChunkClassifier;
  private pluginRegistry: Map<string, PluginRegistration>;
  private routingStats: RoutingStatistics;
  private cache: RoutingCache;
  
  async routeChunks(
    chunks: TextChunk[],
    availablePlugins: string[]
  ): Promise<RoutingPlan> {
    // Step 1: Batch classify all chunks
    const classifications = await this.classifier.classifyBatch(chunks);
    
    // Step 2: Create routing matrix
    const routingMatrix = new RoutingMatrix(chunks.length, availablePlugins.length);
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const classification = classifications[i];
      
      // Check cache first
      const cachedRouting = this.cache.get(classification.fingerprint);
      if (cachedRouting) {
        routingMatrix.setRow(i, cachedRouting);
        continue;
      }
      
      // Calculate affinity scores for each plugin
      for (const pluginId of availablePlugins) {
        const score = this.calculateAffinity(
          chunk,
          classification,
          this.pluginRegistry.get(pluginId)!
        );
        routingMatrix.set(i, pluginId, score);
      }
    }
    
    // Step 3: Optimize routing
    const optimizedPlan = this.optimizeRouting(routingMatrix, {
      maxPluginsPerChunk: 3,
      minAffinityScore: 0.5,
      loadBalancing: true,
      batchingPreference: true
    });
    
    return optimizedPlan;
  }
  
  private calculateAffinity(
    chunk: TextChunk,
    classification: ChunkClassification,
    plugin: PluginRegistration
  ): number {
    let score = 0;
    
    // Pattern matching score
    for (const pattern of plugin.patterns.required || []) {
      if (this.matchesPattern(chunk.text, pattern)) {
        score += pattern.confidence || 1.0;
      }
    }
    
    // Topic relevance
    const topicOverlap = this.calculateTopicOverlap(
      classification.topics,
      plugin.interests.topics || []
    );
    score += topicOverlap * 0.5;
    
    // Historical performance
    const historicalScore = this.routingStats.getSuccessRate(
      plugin.id,
      classification.type
    );
    score += historicalScore * 0.3;
    
    // Context bonus
    if (chunk.metadata?.section && 
        plugin.interests.sections?.includes(chunk.metadata.section)) {
      score += 0.2;
    }
    
    return Math.min(score, 1.0);
  }
}
```

### 3. ML-Based Chunk Classification
Use a lightweight ML model to classify chunks first.

```typescript
class ChunkClassifier {
  private model: TFLiteModel;  // Lightweight model for edge deployment
  private tokenizer: Tokenizer;
  private labelEncoder: LabelEncoder;
  
  async classifyBatch(chunks: TextChunk[]): Promise<ChunkClassification[]> {
    // Tokenize all chunks
    const tokenized = chunks.map(chunk => 
      this.tokenizer.encode(chunk.text, { maxLength: 512 })
    );
    
    // Batch inference
    const predictions = await this.model.predict(tokenized);
    
    // Decode predictions
    return predictions.map((pred, i) => ({
      chunkId: chunks[i].id,
      topics: this.labelEncoder.decodeTopics(pred.topics),
      contentTypes: this.labelEncoder.decodeContentTypes(pred.types),
      complexity: pred.complexity,
      hasFormulas: pred.features.hasFormulas,
      hasClaims: pred.features.hasClaims,
      hasForecasts: pred.features.hasForecasts,
      language: pred.language,
      fingerprint: this.generateFingerprint(pred)
    }));
  }
}

// Pre-computed features for routing
interface ChunkClassification {
  chunkId: string;
  topics: string[];           // ["mathematics", "statistics"]
  contentTypes: string[];     // ["equation", "proof", "claim"]
  complexity: number;         // 0-1 score
  hasFormulas: boolean;
  hasClaims: boolean;
  hasForecasts: boolean;
  language: string;
  fingerprint: string;        // For caching routing decisions
}
```

### 4. Hierarchical Routing
Route first by high-level categories, then specific plugins.

```typescript
class HierarchicalRouter {
  private categoryTree: CategoryTree;
  
  async route(chunks: TextChunk[]): Promise<RoutingPlan> {
    const plan = new RoutingPlan();
    
    // Level 1: Categorize chunks into broad categories
    const categorized = await this.categorizeChunks(chunks);
    
    // Level 2: Route within categories
    for (const [category, categoryChunks] of categorized) {
      const categoryPlugins = this.getPluginsForCategory(category);
      
      if (category === 'technical') {
        // Technical content gets fine-grained routing
        await this.routeTechnicalContent(categoryChunks, categoryPlugins, plan);
      } else if (category === 'argumentative') {
        // Arguments get claim extraction + fact checking
        await this.routeArgumentativeContent(categoryChunks, categoryPlugins, plan);
      } else if (category === 'narrative') {
        // Narrative gets basic analysis only
        await this.routeNarrativeContent(categoryChunks, categoryPlugins, plan);
      }
    }
    
    return plan;
  }
  
  private async categorizeChunks(
    chunks: TextChunk[]
  ): Promise<Map<ContentCategory, TextChunk[]>> {
    // Use a fast classifier to categorize chunks
    const categories = new Map<ContentCategory, TextChunk[]>();
    
    const classifications = await this.quickClassifier.classify(chunks);
    
    classifications.forEach((classification, i) => {
      const category = classification.primaryCategory;
      if (!categories.has(category)) {
        categories.set(category, []);
      }
      categories.get(category)!.push(chunks[i]);
    });
    
    return categories;
  }
}
```

### 5. Dynamic Routing with Feedback
Route based on early results and adapt.

```typescript
class AdaptiveRouter {
  private routingModel: OnlineMLModel;
  private activeRoutes: Map<string, ActiveRoute>;
  
  async routeAdaptively(
    chunks: TextChunk[],
    plugins: AnalysisPlugin[]
  ): Promise<RoutingPlan> {
    const plan = new RoutingPlan();
    
    // Initial conservative routing
    const initialBatch = chunks.slice(0, Math.min(10, chunks.length));
    const exploratoryRouting = this.createExploratoryRouting(initialBatch, plugins);
    
    // Process initial batch
    const initialResults = await this.processRouting(exploratoryRouting);
    
    // Learn from results
    const routingInsights = this.analyzeResults(initialResults);
    
    // Update routing model
    this.routingModel.update(routingInsights);
    
    // Route remaining chunks based on learning
    const remainingChunks = chunks.slice(10);
    const optimizedRouting = this.routingModel.predict(remainingChunks);
    
    // Combine plans
    plan.merge(exploratoryRouting);
    plan.merge(optimizedRouting);
    
    return plan;
  }
  
  private analyzeResults(results: ProcessingResults): RoutingInsights {
    return {
      // Which plugins found useful things
      productiveRoutes: results.filter(r => r.findings.length > 0)
        .map(r => ({ chunkType: r.chunkClassification, pluginId: r.pluginId })),
      
      // Which were wasteful
      wastefulRoutes: results.filter(r => 
        r.findings.length === 0 && r.processingTime > 1000
      ).map(r => ({ chunkType: r.chunkClassification, pluginId: r.pluginId })),
      
      // Unexpected discoveries
      surprises: results.filter(r => r.unexpectedFindings).map(r => ({
        chunkType: r.chunkClassification,
        pluginId: r.pluginId,
        finding: r.unexpectedFindings
      }))
    };
  }
}
```

### 6. Rule-Based with Override System
Combine rules with manual overrides and learning.

```typescript
class RuleBasedRouter {
  private rules: RoutingRule[];
  private overrides: Map<string, RoutingOverride>;
  private performance: PerformanceTracker;
  
  async route(chunks: TextChunk[], context: DocumentContext): Promise<RoutingPlan> {
    const plan = new RoutingPlan();
    
    for (const chunk of chunks) {
      // Check for manual overrides first
      const override = this.checkOverrides(chunk, context);
      if (override) {
        plan.addRouting(chunk.id, override.plugins);
        continue;
      }
      
      // Apply rules in priority order
      const applicablePlugins = new Set<string>();
      
      for (const rule of this.rules) {
        if (rule.condition(chunk, context)) {
          rule.plugins.forEach(p => applicablePlugins.add(p));
          
          if (rule.exclusive) {
            break;  // Don't check more rules
          }
        }
      }
      
      // Apply performance-based filtering
      const filteredPlugins = this.filterByPerformance(
        Array.from(applicablePlugins),
        chunk,
        context
      );
      
      plan.addRouting(chunk.id, filteredPlugins);
    }
    
    return plan;
  }
  
  // Example rules
  private rules: RoutingRule[] = [
    {
      name: 'math_equations',
      priority: 1,
      condition: (chunk, ctx) => 
        /\d+\s*[\+\-\*/=]\s*\d+/.test(chunk.text) ||
        chunk.metadata?.hasLatex,
      plugins: ['math-checker', 'notation-validator'],
      exclusive: false
    },
    {
      name: 'research_methodology',
      priority: 2,
      condition: (chunk, ctx) => 
        ctx.documentType === 'research_paper' &&
        chunk.metadata?.section === 'methodology',
      plugins: ['methodology-analyzer', 'stats-checker', 'math-checker'],
      exclusive: false
    },
    {
      name: 'pure_references',
      priority: 10,
      condition: (chunk, ctx) => 
        chunk.metadata?.section === 'references' ||
        chunk.text.match(/^\[\d+\]/gm)?.length > 5,
      plugins: ['citation-checker'],  // Only check citations
      exclusive: true  // Skip other plugins
    }
  ];
}
```

## Hybrid Approach: Best of All Worlds

```typescript
class HybridRouter {
  private mlClassifier: ChunkClassifier;
  private ruleEngine: RuleBasedRouter;
  private adaptiveRouter: AdaptiveRouter;
  private cache: RoutingCache;
  
  async route(
    document: Document,
    chunks: TextChunk[],
    availablePlugins: AnalysisPlugin[]
  ): Promise<RoutingPlan> {
    // 1. Fast classification of all chunks
    const classifications = await this.mlClassifier.classifyBatch(chunks);
    
    // 2. Check cache for similar chunks
    const { cached, uncached } = this.checkCache(chunks, classifications);
    
    // 3. Apply rules to uncached chunks
    const ruleBasedRouting = await this.ruleEngine.route(
      uncached,
      { documentType: document.type, classifications }
    );
    
    // 4. For ambiguous chunks, use adaptive routing
    const ambiguousChunks = this.identifyAmbiguous(uncached, ruleBasedRouting);
    const adaptiveRouting = await this.adaptiveRouter.routeAdaptively(
      ambiguousChunks,
      availablePlugins
    );
    
    // 5. Combine all routing decisions
    const finalPlan = this.combineRoutingPlans([
      cached,
      ruleBasedRouting,
      adaptiveRouting
    ]);
    
    // 6. Optimize for batching and performance
    return this.optimizeRoutingPlan(finalPlan);
  }
}
```

## Key Insights

1. **Pre-classification is Key**: Classifying chunks once and routing based on classification is more efficient than having each plugin check each chunk.

2. **Multi-level Routing**: Combine different strategies:
   - Rules for obvious cases
   - ML for complex classification  
   - Adaptive for learning from results
   - Cache for repeated patterns

3. **Performance Tracking**: Track which plugin/chunk combinations are productive to improve future routing.

4. **Batch Optimization**: Group similar chunks for the same plugin to improve efficiency.

5. **Context Awareness**: Use document-level context, not just chunk content, for routing decisions.