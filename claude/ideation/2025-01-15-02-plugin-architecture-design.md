# Plugin Architecture with State Management

## Core Concept
Plugins process chunks in Phase 1 (gathering data) and synthesize in Phase 2 (final analysis).

## Basic Plugin Interface Design

```typescript
interface AnalysisPlugin<TState = any> {
  // Metadata
  id: string;
  name: string;
  description: string;
  
  // Capabilities
  canProcess(chunk: TextChunk): boolean;
  requiredForDocument?(doc: DocumentProfile): boolean;
  
  // Phase 1: Process individual chunks
  processChunk(chunk: TextChunk): Promise<ChunkResult>;
  
  // Phase 2: Synthesize all findings
  synthesize(): Promise<SynthesisResult>;
  
  // State management
  getState(): TState;
  clearState(): void;
}

interface ChunkResult {
  // Immediate findings from this chunk
  findings?: Finding[];
  
  // LLM interactions for transparency
  llmCalls: LLMInteraction[];
  
  // Metadata about processing
  metadata?: {
    tokensUsed: number;
    processingTime: number;
    confidence?: number;
  };
}

interface SynthesisResult {
  summary: string;
  findings: Finding[];
  recommendations?: string[];
  llmCalls: LLMInteraction[];
  visualizations?: any[]; // Charts, graphs, etc.
}
```

## Example Plugin Implementations

### 1. Spelling/Grammar Plugin
```typescript
class SpellingGrammarPlugin implements AnalysisPlugin<SpellingState> {
  private state: SpellingState = {
    errors: [],
    commonPatterns: new Map(),
    documentStyle: null
  };
  
  canProcess(chunk: TextChunk): boolean {
    // Process all chunks
    return true;
  }
  
  async processChunk(chunk: TextChunk): Promise<ChunkResult> {
    const llmCall = await this.checkSpelling(chunk);
    const errors = llmCall.result.errors;
    
    // Store errors with context
    this.state.errors.push(...errors.map(e => ({
      ...e,
      chunkId: chunk.id,
      context: chunk.getContext(e.position)
    })));
    
    // Track patterns
    errors.forEach(error => {
      const count = this.state.commonPatterns.get(error.type) || 0;
      this.state.commonPatterns.set(error.type, count + 1);
    });
    
    return {
      findings: errors.map(e => ({
        type: 'spelling_error',
        severity: 'low',
        message: e.message,
        location: e.position
      })),
      llmCalls: [llmCall]
    };
  }
  
  async synthesize(): Promise<SynthesisResult> {
    // Detect document style from accumulated data
    const styleAnalysis = await this.analyzeWritingStyle(this.state.errors);
    
    // Find systematic issues
    const systematicIssues = this.findPatterns(this.state.commonPatterns);
    
    return {
      summary: `Found ${this.state.errors.length} spelling/grammar issues. ${systematicIssues.summary}`,
      findings: [
        ...this.state.errors.map(e => this.createFinding(e)),
        ...systematicIssues.findings
      ],
      recommendations: this.generateRecommendations(systematicIssues),
      llmCalls: [styleAnalysis.llmCall]
    };
  }
}
```

### 2. Math Verification Plugin
```typescript
class MathPlugin implements AnalysisPlugin<MathState> {
  private state: MathState = {
    equations: [],
    verificationResults: new Map(),
    relatedEquations: [], // Equations that reference each other
    assumptionChains: []
  };
  
  canProcess(chunk: TextChunk): boolean {
    // Only process chunks with math-like content
    return /[\d\+\-\*/=]|\\[a-zA-Z]+/.test(chunk.text);
  }
  
  async processChunk(chunk: TextChunk): Promise<ChunkResult> {
    // Extract equations
    const extraction = await this.extractEquations(chunk);
    
    // Store equations with full context
    extraction.equations.forEach(eq => {
      this.state.equations.push({
        ...eq,
        chunkId: chunk.id,
        surroundingText: chunk.text,
        sectionContext: chunk.metadata?.section
      });
    });
    
    // Immediate verification for simple equations
    const immediateResults: Finding[] = [];
    for (const eq of extraction.equations) {
      if (this.isSimpleEquation(eq)) {
        const result = await this.verifyEquation(eq);
        this.state.verificationResults.set(eq.id, result);
        if (result.hasError) {
          immediateResults.push(this.createErrorFinding(eq, result));
        }
      }
    }
    
    return {
      findings: immediateResults,
      llmCalls: [extraction.llmCall, ...extraction.equations.map(eq => 
        this.state.verificationResults.get(eq.id)?.llmCall
      ).filter(Boolean)]
    };
  }
  
  async synthesize(): Promise<SynthesisResult> {
    // Phase 2: Verify complex equations with full context
    const complexEquations = this.state.equations.filter(eq => 
      !this.state.verificationResults.has(eq.id)
    );
    
    // Check relationships between equations
    const relationshipAnalysis = await this.analyzeEquationRelationships(
      this.state.equations
    );
    
    // Verify equation chains
    const chainVerifications = await this.verifyEquationChains(
      relationshipAnalysis.chains
    );
    
    // Check dimensional consistency across document
    const dimensionalAnalysis = await this.checkDimensionalConsistency(
      this.state.equations
    );
    
    return {
      summary: this.generateMathSummary(),
      findings: [
        ...Array.from(this.state.verificationResults.values())
          .filter(r => r.hasError)
          .map(r => this.createErrorFinding(r.equation, r)),
        ...chainVerifications.errors,
        ...dimensionalAnalysis.inconsistencies
      ],
      recommendations: this.generateMathRecommendations(),
      llmCalls: [
        relationshipAnalysis.llmCall,
        ...chainVerifications.llmCalls,
        dimensionalAnalysis.llmCall
      ],
      visualizations: [this.createEquationGraph()]
    };
  }
}
```

### 3. Fact Checking Plugin
```typescript
class FactCheckPlugin implements AnalysisPlugin<FactCheckState> {
  private state: FactCheckState = {
    claims: [],
    verifications: new Map(),
    sources: new Map(),
    contradictions: []
  };
  
  canProcess(chunk: TextChunk): boolean {
    // Look for factual claims
    return this.hasFactualClaims(chunk.text);
  }
  
  async processChunk(chunk: TextChunk): Promise<ChunkResult> {
    // Extract claims
    const claims = await this.extractClaims(chunk);
    
    // Store with context for later verification
    claims.forEach(claim => {
      this.state.claims.push({
        ...claim,
        chunkId: chunk.id,
        fullContext: chunk.getExpandedContext(100), // 100 words around
        documentSection: chunk.metadata?.section,
        relatedClaims: [] // Will fill in synthesis phase
      });
    });
    
    // Check for internal contradictions immediately
    const newContradictions = this.checkContradictions(
      claims,
      this.state.claims.slice(0, -claims.length) // Previous claims
    );
    
    this.state.contradictions.push(...newContradictions);
    
    return {
      findings: newContradictions.map(c => ({
        type: 'contradiction',
        severity: 'high',
        message: `Contradicting claims: "${c.claim1.text}" vs "${c.claim2.text}"`,
        location: c.claim1.location
      })),
      llmCalls: [claims.llmCall]
    };
  }
  
  async synthesize(): Promise<SynthesisResult> {
    // Group related claims
    const claimGroups = this.groupRelatedClaims(this.state.claims);
    
    // Prioritize claims for checking
    const prioritizedClaims = this.prioritizeClaims(claimGroups);
    
    // Fact check high-priority claims
    const verifications = await this.verifyClaimsInBatches(prioritizedClaims);
    
    // Find patterns in false claims
    const patterns = this.analyzeFalseClaimPatterns(verifications);
    
    return {
      summary: this.generateFactCheckSummary(verifications),
      findings: [
        ...verifications.filter(v => !v.isTrue).map(v => ({
          type: 'false_claim',
          severity: v.importance === 'high' ? 'high' : 'medium',
          message: v.explanation,
          location: v.claim.location,
          evidence: v.sources
        })),
        ...this.state.contradictions.map(c => ({
          type: 'contradiction',
          severity: 'high',
          message: c.description
        }))
      ],
      recommendations: patterns.recommendations,
      llmCalls: verifications.flatMap(v => v.llmCalls),
      visualizations: [this.createClaimNetwork()]
    };
  }
}
```

### 4. Forecasting Plugin
```typescript
class ForecastingPlugin implements AnalysisPlugin<ForecastState> {
  private state: ForecastState = {
    predictions: [],
    baseRates: new Map(),
    relatedForecasts: [],
    timeline: []
  };
  
  canProcess(chunk: TextChunk): boolean {
    // Look for future-oriented language
    return /will|by \d{4}|forecast|predict|expect/i.test(chunk.text);
  }
  
  async processChunk(chunk: TextChunk): Promise<ChunkResult> {
    const predictions = await this.extractPredictions(chunk);
    
    // Store predictions with metadata
    predictions.forEach(pred => {
      this.state.predictions.push({
        ...pred,
        chunkId: chunk.id,
        context: {
          before: chunk.getTextBefore(200),
          after: chunk.getTextAfter(200)
        },
        domain: this.categorizeDomain(pred),
        confidence: this.assessAuthorConfidence(pred, chunk)
      });
    });
    
    // Extract any base rate information
    const baseRates = await this.extractBaseRates(chunk);
    baseRates.forEach(br => {
      this.state.baseRates.set(br.event, br);
    });
    
    return {
      findings: predictions.map(p => ({
        type: 'forecast',
        severity: 'info',
        message: `Prediction: ${p.text}`,
        metadata: { timeframe: p.timeframe, topic: p.topic }
      })),
      llmCalls: [predictions.llmCall, baseRates.llmCall]
    };
  }
  
  async synthesize(): Promise<SynthesisResult> {
    // Group related forecasts
    const forecastGroups = this.groupRelatedForecasts(this.state.predictions);
    
    // Generate our own forecasts for comparison
    const ourForecasts = await Promise.all(
      forecastGroups.map(group => this.generateForecast(group))
    );
    
    // Analyze forecast consistency
    const consistencyAnalysis = this.analyzeConsistency(forecastGroups);
    
    // Create timeline visualization
    const timeline = this.createForecastTimeline(this.state.predictions);
    
    // Check against base rates
    const baseRateAnalysis = this.compareToBaseRates(
      this.state.predictions,
      this.state.baseRates
    );
    
    return {
      summary: this.generateForecastSummary(ourForecasts),
      findings: [
        ...ourForecasts.map(f => ({
          type: 'forecast_analysis',
          severity: 'info',
          message: `Our forecast: ${f.probability}% for "${f.question}"`,
          metadata: {
            authorPrediction: f.originalPrediction,
            ourAnalysis: f.reasoning,
            agreement: f.agreesWithAuthor
          }
        })),
        ...consistencyAnalysis.inconsistencies,
        ...baseRateAnalysis.warnings
      ],
      recommendations: this.generateForecastRecommendations(
        ourForecasts,
        consistencyAnalysis
      ),
      llmCalls: ourForecasts.flatMap(f => f.llmCalls),
      visualizations: [timeline, this.createProbabilityDistribution()]
    };
  }
}
```

## Plugin Manager Design

```typescript
class PluginManager {
  private plugins: Map<string, AnalysisPlugin> = new Map();
  private chunkRouter: ChunkRouter;
  private executionPlanner: ExecutionPlanner;
  
  async analyzeDocument(document: Document): Promise<DocumentAnalysis> {
    // Phase 0: Profile document
    const profile = await this.profileDocument(document);
    
    // Select relevant plugins
    const activePlugins = this.selectPlugins(profile);
    
    // Create chunks with metadata
    const chunks = await this.createChunks(document, profile);
    
    // Phase 1: Route chunks to plugins
    const routingPlan = this.chunkRouter.plan(chunks, activePlugins);
    
    // Execute chunk processing in parallel with smart batching
    const chunkResults = await this.executeChunkProcessing(routingPlan);
    
    // Phase 2: Synthesis
    const synthesisResults = await this.executeSynthesis(activePlugins);
    
    // Phase 3: Cross-plugin analysis
    const crossAnalysis = await this.performCrossAnalysis(
      synthesisResults,
      activePlugins
    );
    
    // Combine all results
    return this.combineResults(chunkResults, synthesisResults, crossAnalysis);
  }
  
  private async executeChunkProcessing(plan: RoutingPlan): Promise<ChunkResults> {
    // Group by plugin to minimize context switching
    const batches = this.createProcessingBatches(plan);
    
    // Process batches with concurrency control
    const results = await this.executionPlanner.processBatches(batches, {
      maxConcurrent: 5,
      maxLLMCallsPerSecond: 10,
      priorityOrdering: true
    });
    
    return results;
  }
}
```

## Advanced Features

### 1. Plugin Communication
```typescript
interface PluginContext {
  // Plugins can query other plugins' state
  queryPlugin<T>(pluginId: string, query: any): Promise<T>;
  
  // Subscribe to other plugins' findings
  subscribe(pluginId: string, eventType: string, callback: Function): void;
  
  // Share intermediate results
  broadcast(event: PluginEvent): void;
}

class CollaborativePlugin implements AnalysisPlugin {
  constructor(private context: PluginContext) {}
  
  async processChunk(chunk: TextChunk): Promise<ChunkResult> {
    // Check if math plugin found equations
    const equations = await this.context.queryPlugin('math', {
      type: 'equations',
      chunkId: chunk.id
    });
    
    if (equations.length > 0) {
      // Do special processing for chunks with equations
      return this.processWithEquations(chunk, equations);
    }
    
    return this.processNormally(chunk);
  }
}
```

### 2. Dynamic Plugin Loading
```typescript
class PluginRegistry {
  private availablePlugins: Map<string, PluginDefinition> = new Map();
  
  async loadPlugin(pluginId: string): Promise<AnalysisPlugin> {
    const definition = this.availablePlugins.get(pluginId);
    
    if (definition.type === 'builtin') {
      return new definition.class();
    } else if (definition.type === 'dynamic') {
      // Load from file/network
      const module = await import(definition.path);
      return new module.default();
    } else if (definition.type === 'wasm') {
      // Load WebAssembly plugin
      const wasm = await WebAssembly.instantiate(definition.binary);
      return new WasmPluginAdapter(wasm);
    }
  }
  
  suggestPlugins(profile: DocumentProfile): string[] {
    // ML model to suggest best plugins
    return this.pluginSuggestionModel.predict(profile);
  }
}
```

### 3. Plugin State Persistence
```typescript
interface StatePersistence {
  save(pluginId: string, state: any): Promise<void>;
  load(pluginId: string): Promise<any>;
  checkpoint(pluginId: string, chunkId: string): Promise<void>;
  rollback(pluginId: string, checkpointId: string): Promise<void>;
}

class PersistentPlugin implements AnalysisPlugin {
  async processChunk(chunk: TextChunk): Promise<ChunkResult> {
    try {
      const result = await this.doProcessing(chunk);
      
      // Checkpoint after each chunk
      await this.persistence.checkpoint(this.id, chunk.id);
      
      return result;
    } catch (error) {
      // Rollback on error
      await this.persistence.rollback(this.id, chunk.id);
      throw error;
    }
  }
}
```

### 4. Plugin Performance Monitoring
```typescript
interface PluginMetrics {
  chunksProcessed: number;
  averageProcessingTime: number;
  llmTokensUsed: number;
  accuracy?: number; // If we have ground truth
  userFeedbackScore?: number;
}

class MonitoredPluginWrapper implements AnalysisPlugin {
  constructor(
    private plugin: AnalysisPlugin,
    private monitor: PerformanceMonitor
  ) {}
  
  async processChunk(chunk: TextChunk): Promise<ChunkResult> {
    const start = Date.now();
    const startTokens = await this.getLLMTokenCount();
    
    const result = await this.plugin.processChunk(chunk);
    
    const metrics = {
      processingTime: Date.now() - start,
      tokensUsed: await this.getLLMTokenCount() - startTokens,
      chunkSize: chunk.text.length,
      findingsCount: result.findings?.length || 0
    };
    
    this.monitor.record(this.plugin.id, metrics);
    
    return result;
  }
}
```

### 5. Smart Chunk Routing
```typescript
class ChunkRouter {
  private routingModel: RoutingModel;
  
  plan(chunks: TextChunk[], plugins: AnalysisPlugin[]): RoutingPlan {
    const plan = new RoutingPlan();
    
    for (const chunk of chunks) {
      // Get plugin recommendations from ML model
      const recommendations = this.routingModel.recommend(chunk, plugins);
      
      // Apply business rules
      const finalAssignments = this.applyRules(recommendations, chunk);
      
      // Optimize for batching
      plan.assign(chunk, finalAssignments);
    }
    
    // Optimize execution order
    return this.optimizeExecutionOrder(plan);
  }
  
  private applyRules(
    recommendations: PluginRecommendation[],
    chunk: TextChunk
  ): string[] {
    const assigned: string[] = [];
    
    // Always run critical plugins
    if (chunk.metadata?.isCritical) {
      assigned.push('fact-check', 'math-check');
    }
    
    // Add recommended plugins above threshold
    recommendations
      .filter(r => r.confidence > 0.7)
      .forEach(r => assigned.push(r.pluginId));
    
    // Respect plugin dependencies
    assigned.forEach(pluginId => {
      const deps = this.getPluginDependencies(pluginId);
      deps.forEach(dep => {
        if (!assigned.includes(dep)) assigned.push(dep);
      });
    });
    
    return assigned;
  }
}
```

## Benefits of This Architecture

1. **Separation of Concerns**: Each plugin handles one type of analysis
2. **State Management**: Plugins can accumulate data across chunks
3. **Two-Phase Processing**: Immediate findings + comprehensive synthesis
4. **Flexibility**: Easy to add/remove plugins based on document type
5. **Performance**: Smart routing avoids unnecessary processing
6. **Transparency**: All LLM interactions are tracked
7. **Extensibility**: New plugins can be added without changing core
8. **Collaboration**: Plugins can share data and insights
9. **Fault Tolerance**: Plugin failures don't crash the system
10. **Optimization**: Batching and routing minimize API calls