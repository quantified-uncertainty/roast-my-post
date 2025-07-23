# Forecast Analyzer - Simple Class Implementation

This is a simplified, inheritance-free implementation of the forecast analyzer that uses the `extract-forecasting-claims` tool.

## Key Improvements

### 1. No Inheritance

- Standalone class without extending any base classes
- Direct implementation without framework constraints

### 2. Rich Data from Tool

The implementation fully leverages the data from `extract-forecasting-claims`:

- **precisionScore**: How specific and precise the prediction is
- **verifiabilityScore**: How verifiable the prediction is
- **importanceScore**: How important/significant the prediction is
- **rewrittenPredictionText**: A cleaner, more precise version of the prediction
- **thinking**: The tool's reasoning about the forecast

### 3. Quality-Based Selection

Instead of arbitrary selection, forecasts are chosen for deeper analysis based on:

- Future-oriented (isFuture flag)
- Verifiability score > 50
- Combined importance and verifiability scores

### 4. Enhanced Comments

Comments now include:

- The cleaner rewritten prediction text
- Quality indicators (important, verifiable, precise)
- Severity based on importance score

### 5. Better Analysis

The analysis summary includes:

- Quality metrics (average scores)
- Distribution by topic
- Timeframe analysis

## Usage

```typescript
import { ForecastAnalyzerJob } from "./index";
import { TextChunk } from "../../TextChunk";

// Create analyzer
const analyzer = new ForecastAnalyzerJob({
  documentText: fullDocument,
  chunks: textChunks,
});

// Run analysis
const results = await analyzer.analyze();

// Access results
console.log(results.summary);
console.log(results.analysis);
console.log(results.comments);
```

## API

### Static Methods

- `displayName()`: Returns "FORECAST"
- `promptForWhenToUse()`: Returns routing prompt
- `routingExamples()`: Returns example routing decisions

### Instance Methods

- `analyze()`: Main analysis method - runs all processing
- `getResults()`: Returns the analysis results
- `getDebugInfo()`: Returns debug information

### Results Structure

```typescript
{
  summary: string;           // Brief summary
  analysis: string;          // Detailed analysis
  comments: Comment[];       // UI comments
  llmInteractions: LLMInteraction[];
  cost: number;
}
```
