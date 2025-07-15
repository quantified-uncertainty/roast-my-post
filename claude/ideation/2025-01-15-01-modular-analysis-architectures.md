# Alternative Modular Analysis Architectures

## 1. Pipeline Architecture (Sequential Processing)
Each module processes the entire document and enriches it for the next module.

```typescript
interface PipelineStage {
  name: string;
  process(doc: EnrichedDocument): Promise<EnrichedDocument>;
}

class AnalysisPipeline {
  stages: PipelineStage[] = [
    new ChunkingStage(),        // Creates chunks
    new MathAnalysisStage(),    // Adds math errors to chunks
    new FactCheckStage(),       // Adds fact checks to chunks
    new ForecastingStage(),     // Adds forecasts to chunks
    new SynthesisStage()        // Combines all analyses
  ];
  
  async analyze(document: Document): Promise<AnalysisResult> {
    let enrichedDoc = document;
    for (const stage of this.stages) {
      enrichedDoc = await stage.process(enrichedDoc);
    }
    return enrichedDoc.finalAnalysis;
  }
}
```

**Pros:** Simple, easy to understand, clear data flow
**Cons:** Can't skip stages, might process irrelevant content, sequential = slower

## 2. Event-Driven Architecture
Modules subscribe to patterns and react when found.

```typescript
class EventBus {
  private subscribers = new Map<RegExp, AnalysisModule[]>();
  
  subscribe(pattern: RegExp, module: AnalysisModule) {
    if (!this.subscribers.has(pattern)) {
      this.subscribers.set(pattern, []);
    }
    this.subscribers.get(pattern)!.push(module);
  }
  
  async processDocument(doc: Document) {
    const events: AnalysisEvent[] = [];
    
    // Scan document for patterns
    for (const [pattern, modules] of this.subscribers) {
      const matches = doc.content.matchAll(pattern);
      for (const match of matches) {
        for (const module of modules) {
          events.push(module.createEvent(match));
        }
      }
    }
    
    // Process all events in parallel
    const results = await Promise.all(
      events.map(event => event.module.analyze(event))
    );
    
    return this.mergeResults(results);
  }
}

// Usage
eventBus.subscribe(/\d+\s*[+\-*/]\s*\d+/, mathChecker);
eventBus.subscribe(/will .* by \d{4}/, forecaster);
eventBus.subscribe(/[A-Z][a-z]+ (said|claims|states)/, factChecker);
```

**Pros:** Highly parallel, modules only process relevant content, extensible
**Cons:** Pattern matching might miss context, complex event coordination

## 3. Graph-Based Analysis
Build a knowledge graph from the document, then query it.

```typescript
class DocumentGraph {
  nodes: Map<string, GraphNode> = new Map();
  edges: Edge[] = [];
  
  async buildFromDocument(doc: Document) {
    // Extract entities, claims, relationships
    const entities = await extractEntities(doc);
    const claims = await extractClaims(doc);
    const relationships = await extractRelationships(doc);
    
    // Build graph
    this.addNodes(entities, claims);
    this.addEdges(relationships);
  }
  
  // Modules query the graph
  async analyzeMath(): Promise<MathError[]> {
    const mathNodes = this.queryNodes({ type: 'equation' });
    return Promise.all(mathNodes.map(node => 
      mathChecker.validateEquation(node)
    ));
  }
  
  async checkFacts(): Promise<FactCheck[]> {
    const claimNodes = this.queryNodes({ type: 'claim' });
    return Promise.all(claimNodes.map(node =>
      factChecker.verifyClaim(node, this.getContext(node))
    ));
  }
}
```

**Pros:** Rich context awareness, can find non-local relationships, queryable
**Cons:** Complex to build, high upfront cost, might miss narrative flow

## 4. Stream Processing Architecture
Process document as a stream with modules as filters/transformers.

```typescript
class DocumentStream {
  async *tokenize(doc: Document): AsyncGenerator<Token> {
    // Yield tokens (words, sentences, paragraphs)
    for (const paragraph of doc.paragraphs) {
      for (const sentence of paragraph.sentences) {
        yield { type: 'sentence', content: sentence, context: paragraph };
      }
    }
  }
}

class StreamProcessor {
  filters: StreamFilter[] = [];
  
  addFilter(filter: StreamFilter) {
    this.filters.push(filter);
  }
  
  async process(doc: Document) {
    const stream = new DocumentStream().tokenize(doc);
    const results: AnalysisResult[] = [];
    
    for await (const token of stream) {
      // Each filter can transform or analyze the token
      let processedToken = token;
      for (const filter of this.filters) {
        if (filter.matches(processedToken)) {
          const result = await filter.process(processedToken);
          if (result.analysis) results.push(result.analysis);
          processedToken = result.token;
        }
      }
    }
    
    return this.aggregateResults(results);
  }
}
```

**Pros:** Memory efficient, real-time processing possible, composable
**Cons:** Limited lookahead/context, ordering matters, state management complex

## 5. Plugin Architecture with Dynamic Loading
Load analysis modules based on document characteristics.

```typescript
class PluginRegistry {
  private plugins = new Map<string, AnalysisPlugin>();
  
  async analyzeDocument(doc: Document) {
    // First, determine document type and characteristics
    const docProfile = await this.profileDocument(doc);
    
    // Load only relevant plugins
    const relevantPlugins = await this.selectPlugins(docProfile);
    
    // Example: Scientific paper loads math + citations + methodology checker
    // Example: News article loads fact checker + bias detector
    // Example: Business report loads forecasting + financial analysis
    
    const analyses = await Promise.all(
      relevantPlugins.map(plugin => plugin.analyze(doc))
    );
    
    return this.combineAnalyses(analyses);
  }
  
  private async profileDocument(doc: Document): Promise<DocumentProfile> {
    // Quick analysis to determine document type, domain, etc.
    const profile = await lightweightClassifier.classify(doc);
    return {
      type: profile.documentType,        // 'scientific', 'news', 'opinion'
      domains: profile.subjects,         // ['physics', 'climate']
      features: profile.textFeatures,    // hasEquations, hasCitations, etc.
      length: doc.wordCount
    };
  }
}
```

**Pros:** Efficient - only runs relevant analyses, extensible, domain-specific
**Cons:** Requires good document classification, might miss edge cases

## 6. Hierarchical Multi-Resolution Analysis
Analyze at different levels of granularity.

```typescript
class HierarchicalAnalyzer {
  async analyze(doc: Document) {
    // Level 1: Document-wide analysis
    const docLevel = await this.analyzeDocumentLevel(doc);
    
    // Level 2: Section/Chapter analysis
    const sectionResults = await Promise.all(
      doc.sections.map(section => this.analyzeSectionLevel(section, docLevel))
    );
    
    // Level 3: Paragraph analysis (only for interesting sections)
    const detailedResults = [];
    for (const [idx, section] of doc.sections.entries()) {
      if (sectionResults[idx].needsDetailedAnalysis) {
        const paragraphResults = await this.analyzeParagraphs(
          section.paragraphs,
          sectionResults[idx]
        );
        detailedResults.push(...paragraphResults);
      }
    }
    
    // Level 4: Sentence-level (only for specific issues)
    const sentenceResults = await this.analyzeCriticalSentences(
      detailedResults.filter(r => r.hasCriticalContent)
    );
    
    return this.synthesize(docLevel, sectionResults, detailedResults, sentenceResults);
  }
}
```

**Pros:** Efficient drill-down, context-aware, scalable to long documents
**Cons:** Complex coordination, might miss details in "uninteresting" sections

## 7. Voting/Ensemble System
Multiple lightweight analyzers vote on what needs deeper analysis.

```typescript
class VotingAnalyzer {
  private voters: LightweightVoter[] = [
    new MathPatternVoter(),      // Looks for math-like patterns
    new ClaimDetector(),         // Finds factual claims
    new ForecastDetector(),      // Finds predictions
    new ComplexityVoter(),       // Votes based on sentence complexity
    new ControversyDetector()    // Finds potentially controversial statements
  ];
  
  async analyze(doc: Document) {
    const chunks = this.chunkDocument(doc);
    const votingResults = new Map<Chunk, VoteResult[]>();
    
    // Each voter quickly scans all chunks
    for (const voter of this.voters) {
      const votes = await voter.vote(chunks);
      for (const [chunk, vote] of votes) {
        if (!votingResults.has(chunk)) {
          votingResults.set(chunk, []);
        }
        votingResults.get(chunk)!.push(vote);
      }
    }
    
    // Aggregate votes and run detailed analysis on high-vote chunks
    const analysisQueue: AnalysisTask[] = [];
    for (const [chunk, votes] of votingResults) {
      const aggregated = this.aggregateVotes(votes);
      
      if (aggregated.mathScore > 0.7) {
        analysisQueue.push({ chunk, type: 'math', priority: aggregated.mathScore });
      }
      if (aggregated.factScore > 0.6) {
        analysisQueue.push({ chunk, type: 'fact', priority: aggregated.factScore });
      }
      if (aggregated.forecastScore > 0.8) {
        analysisQueue.push({ chunk, type: 'forecast', priority: aggregated.forecastScore });
      }
    }
    
    // Run analyses in priority order
    return this.runAnalyses(analysisQueue);
  }
}
```

**Pros:** Adaptive, can handle unknown content types, community-based decisions
**Cons:** Requires tuning vote thresholds, overhead of multiple passes

## 8. Template-Based Analysis
Pre-defined templates for different document types.

```typescript
class TemplateAnalyzer {
  private templates = new Map<string, AnalysisTemplate>();
  
  constructor() {
    this.templates.set('research_paper', {
      required: ['methodology_check', 'citation_verify', 'math_check'],
      optional: ['forecast_extract'],
      chunkStrategy: 'by_section',
      chunkSize: 500
    });
    
    this.templates.set('news_article', {
      required: ['fact_check', 'source_verify'],
      optional: ['bias_detect', 'forecast_extract'],
      chunkStrategy: 'by_paragraph',
      chunkSize: 200
    });
    
    this.templates.set('opinion_piece', {
      required: ['claim_extract', 'argument_structure'],
      optional: ['fact_check', 'forecast_extract'],
      chunkStrategy: 'by_argument',
      chunkSize: 300
    });
  }
  
  async analyze(doc: Document) {
    // Detect document type
    const docType = await this.detectDocumentType(doc);
    const template = this.templates.get(docType) || this.templates.get('generic');
    
    // Apply template
    const chunks = this.chunkByStrategy(doc, template.chunkStrategy, template.chunkSize);
    const results = {};
    
    // Run required analyses
    for (const analysisType of template.required) {
      results[analysisType] = await this.runAnalysis(analysisType, chunks);
    }
    
    // Run optional analyses if relevant
    for (const analysisType of template.optional) {
      if (await this.isRelevant(analysisType, doc)) {
        results[analysisType] = await this.runAnalysis(analysisType, chunks);
      }
    }
    
    return results;
  }
}
```

**Pros:** Predictable, optimized for document types, easy to configure
**Cons:** Rigid, requires good type detection, might not fit edge cases

## 9. Lazy Evaluation System
Analysis only happens when specific information is requested.

```typescript
class LazyAnalyzer {
  private cache = new Map<string, AnalysisResult>();
  private document: Document;
  
  constructor(document: Document) {
    this.document = document;
  }
  
  async getMathErrors(): Promise<MathError[]> {
    const key = 'math_errors';
    if (this.cache.has(key)) {
      return this.cache.get(key) as MathError[];
    }
    
    // Only analyze math when requested
    const chunks = this.getOrCreateChunks('math_focused');
    const errors = await mathChecker.analyze(chunks);
    this.cache.set(key, errors);
    return errors;
  }
  
  async getFactChecks(topic?: string): Promise<FactCheck[]> {
    const key = `fact_checks_${topic || 'all'}`;
    if (this.cache.has(key)) {
      return this.cache.get(key) as FactCheck[];
    }
    
    // Only fact-check when requested, optionally filtered by topic
    const chunks = topic 
      ? this.getChunksAboutTopic(topic)
      : this.getOrCreateChunks('fact_focused');
    
    const checks = await factChecker.analyze(chunks);
    this.cache.set(key, checks);
    return checks;
  }
  
  // Client can request specific analyses
  async query(analysisQuery: AnalysisQuery): Promise<any> {
    switch (analysisQuery.type) {
      case 'math_errors_in_section':
        return this.getMathErrorsInSection(analysisQuery.section);
      case 'forecasts_about':
        return this.getForecastsAbout(analysisQuery.topic);
      case 'fact_check_claim':
        return this.factCheckSpecificClaim(analysisQuery.claim);
    }
  }
}
```

**Pros:** Very efficient, only computes what's needed, good for interactive use
**Cons:** First request is slow, complex caching logic, not good for batch

## 10. Collaborative Agent System
Multiple specialized agents that communicate to analyze document.

```typescript
class AgentSystem {
  private agents: Agent[] = [];
  private blackboard: Blackboard = new Blackboard();
  
  registerAgent(agent: Agent) {
    this.agents.push(agent);
    agent.setBlackboard(this.blackboard);
  }
  
  async analyze(doc: Document) {
    // Initial document understanding
    await this.blackboard.post('document', doc);
    
    // Agents work collaboratively
    let iteration = 0;
    while (!this.isComplete() && iteration < 10) {
      // Each agent looks at blackboard and decides what to do
      const actions = await Promise.all(
        this.agents.map(agent => agent.proposeAction(this.blackboard))
      );
      
      // Execute high-priority actions
      const prioritized = this.prioritizeActions(actions.filter(a => a !== null));
      for (const action of prioritized) {
        await action.execute();
      }
      
      iteration++;
    }
    
    return this.blackboard.getFinalAnalysis();
  }
}

// Example agents
class MathAgent extends Agent {
  async proposeAction(blackboard: Blackboard): Promise<Action | null> {
    const unverifiedEquations = blackboard.query('equations', { verified: false });
    if (unverifiedEquations.length > 0) {
      return new VerifyEquationsAction(this, unverifiedEquations);
    }
    
    // Help other agents if I'm done
    const complexClaims = blackboard.query('claims', { hasNumbers: true });
    if (complexClaims.length > 0) {
      return new AnnotateNumericalClaimsAction(this, complexClaims);
    }
    
    return null;
  }
}

class FactCheckAgent extends Agent {
  async proposeAction(blackboard: Blackboard): Promise<Action | null> {
    // Check if math agent has annotated any claims I should verify
    const annotatedClaims = blackboard.query('claims', { 
      hasNumbers: true, 
      mathVerified: true,
      factChecked: false 
    });
    
    if (annotatedClaims.length > 0) {
      return new FactCheckClaimsAction(this, annotatedClaims);
    }
    
    // Look for new claims to check
    const uncheckedClaims = blackboard.query('claims', { factChecked: false });
    if (uncheckedClaims.length > 0) {
      return new FactCheckClaimsAction(this, uncheckedClaims.slice(0, 5));
    }
    
    return null;
  }
}
```

**Pros:** Flexible, agents can help each other, emergent behavior, handles complex interactions
**Cons:** Complex to debug, non-deterministic, requires careful coordination

## Comparison Matrix

| Architecture | Speed | Flexibility | Complexity | Best For |
|-------------|-------|-------------|------------|----------|
| Pipeline | Medium | Low | Low | Simple, predictable workflows |
| Event-Driven | Fast | High | Medium | Pattern-based analysis |
| Graph-Based | Slow | Very High | High | Complex relationships |
| Stream | Fast | Medium | Medium | Large documents |
| Plugin | Fast | High | Low | Domain-specific content |
| Hierarchical | Medium | Medium | High | Long documents |
| Voting | Medium | High | Medium | Unknown content types |
| Template | Fast | Low | Low | Known document types |
| Lazy | Variable | High | Medium | Interactive applications |
| Agent | Slow | Very High | Very High | Complex, multi-aspect analysis |

## Hybrid Approaches

We could also combine approaches:

1. **Template + Lazy**: Use templates to define what's available, but only compute on demand
2. **Pipeline + Event**: Main pipeline with event hooks for special cases  
3. **Hierarchical + Voting**: Use voting to decide which levels need analysis
4. **Graph + Agent**: Agents collaborate using a shared knowledge graph
5. **Stream + Plugin**: Stream processing with dynamically loaded filter plugins