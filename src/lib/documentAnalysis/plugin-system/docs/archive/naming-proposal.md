# Plugin Method Naming Proposal

## Current Names vs. New Finding System

Current method names don't align with the finding stages:
- `processChunk()` → creates `PotentialFinding`
- `synthesize()` → analyzes all findings, creates summary
- `generateComments()` → investigates + locates findings + creates comments

## Option 1: Align with Finding Stages

```typescript
interface AnalysisPlugin {
  // Stage 1: Extract potential findings from chunk
  extractPotentialFindings(chunk: TextChunk): Promise<ChunkResult>;
  
  // Stage 2: Investigate findings (could be async, add severity/messages)
  investigateFindings(): Promise<void>;
  
  // Stage 3: Locate findings in document and generate comments
  locateAndComment(context: GenerateCommentsContext): Comment[];
  
  // Stage 4: Synthesize overall analysis
  synthesizeAnalysis(): Promise<SynthesisResult>;
}
```

## Option 2: More Descriptive Names

```typescript
interface AnalysisPlugin {
  // Extract findings from chunk
  analyzeChunk(chunk: TextChunk): Promise<ChunkResult>;
  
  // Convert to comments with locations
  createComments(context: GenerateCommentsContext): Comment[];
  
  // Generate overall summary
  createSummary(): Promise<SynthesisResult>;
}
```

## Option 3: Keep Current Names but Clarify Purpose

```typescript
interface AnalysisPlugin {
  // Process chunk → extract PotentialFindings
  processChunk(chunk: TextChunk): Promise<ChunkResult>;
  
  // Generate comments → investigate + locate + create comments
  generateComments(context: GenerateCommentsContext): Comment[];
  
  // Synthesize → analyze patterns + create summary
  synthesize(): Promise<SynthesisResult>;
}
```

## Option 4: Explicit Pipeline Methods

```typescript
interface AnalysisPlugin {
  // Stage 1: Chunk processing
  extractFindings(chunk: TextChunk): Promise<ChunkResult>;
  
  // Stage 2: Investigation (optional - could be done in extractFindings)
  investigateFindings?(): Promise<void>;
  
  // Stage 3: Location and comment generation
  generateComments(context: GenerateCommentsContext): Comment[];
  
  // Stage 4: Summary generation
  generateSummary(): Promise<SynthesisResult>;
}
```

## Recommendation

I recommend **Option 4** with these names:
- `extractFindings()` - Clear that it extracts findings from chunks
- `investigateFindings()` - Optional method for complex investigation
- `generateComments()` - Keep current name as it's well understood
- `generateSummary()` - Clearer than "synthesize"

This provides clarity while maintaining some backwards compatibility.