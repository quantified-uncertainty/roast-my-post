# Forecast Plugin: Plugin Architecture vs Simple Class

## Key Differences

### 1. Inheritance vs Composition

**Plugin Architecture (forecast/)**
```typescript
export class ForecastPlugin extends PipelinePlugin<ForecastFindingStorage> {
  // Inherits from PipelinePlugin
  // Must implement abstract methods
  // Follows 5-stage pipeline
}
```

**Simple Class (forecast3/)**
```typescript
export class ForecastAnalyzerJob {
  // No inheritance
  // Direct implementation
  // Single analyze() method
}
```

### 2. Method Structure

**Plugin Architecture**
- `extractFromChunk()` - Stage 1
- `investigateFindings()` - Stage 2  
- `locateFindings()` - Stage 3
- `analyzeFindingPatterns()` - Stage 4
- `generateCommentsFromFindings()` - Stage 5

**Simple Class**
- `analyze()` - Main entry point
- `extractForecasts()` - Private method
- `generateOurForecasts()` - Private method
- `createComments()` - Private method
- `generateAnalysis()` - Private method

### 3. State Management

**Plugin Architecture**
```typescript
protected findings: ForecastFindingStorage = {
  potential: [],
  investigated: [],
  located: []
};
```

**Simple Class**
```typescript
private forecasts: ForecastData[] = [];
private comments: Comment[] = [];
private summary: string = "";
private analysis: string = "";
private hasRun = false;
```

### 4. Type Complexity

**Plugin Architecture**
- `ForecastPotentialFinding`
- `ForecastInvestigatedFinding`
- `ForecastLocatedFinding`
- `ForecastFindingStorage`
- Complex generic types

**Simple Class**
- `ForecastData` - Simple interface
- `ForecastComment` - Simple interface
- Standard types (string, Comment[], etc.)

### 5. API Surface

**Plugin Architecture**
```typescript
// Many public/protected methods
name(): string
promptForWhenToUse(): string
routingExamples(): RoutingExample[]
analyze(chunks, documentText): Promise<AnalysisResult>
getDebugInfo(): Record<string, unknown>
getCost(): number
getLLMInteractions(): LLMInteraction[]
// Plus all protected abstract methods
```

**Simple Class**
```typescript
// Minimal public API
static displayName(): string
static promptForWhenToUse(): string
static routingExamples(): RoutingExample[]
analyze(): Promise<AnalysisResult>
getResults(): AnalysisResult
getDebugInfo(): Record<string, unknown>
```

### 6. Benefits of Simple Class Approach

1. **No inheritance complexity** - Easier to understand and modify
2. **Direct control** - No framework constraints
3. **Simpler types** - Less cognitive overhead
4. **Better encapsulation** - Clear public/private boundaries
5. **Easier testing** - Mock fewer dependencies
6. **More flexible** - Can optimize flow as needed

### 7. Trade-offs

**Plugin Architecture Pros:**
- Consistent interface across all plugins
- Shared utilities and helpers
- Enforced structure

**Simple Class Pros:**
- Simpler to understand
- Easier to maintain
- More flexible implementation
- Better performance (can skip unnecessary stages)
- Clearer data flow

## Migration Guide

To convert other plugins:

1. Remove inheritance from `PipelinePlugin`
2. Convert instance methods to static for metadata
3. Combine pipeline stages into logical methods
4. Simplify finding types to just what's needed
5. Use constructor to accept document and chunks
6. Implement single `analyze()` method
7. Return `AnalysisResult` directly