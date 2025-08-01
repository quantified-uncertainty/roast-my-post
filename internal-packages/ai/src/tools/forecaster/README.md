# Forecaster Tool

A tool that generates probability forecasts using multiple independent Claude analyses.

## Overview

The Forecaster Tool asks Claude to make independent probability assessments of a given question, then aggregates them using statistical methods to produce a final forecast with confidence levels.

## Usage

### API Endpoint
```
POST /api/tools/forecaster
```

### Input Schema
```typescript
{
  question: string;         // The question to forecast (1-500 chars)
  context?: string;         // Additional context (max 1000 chars)
  numForecasts?: number;    // Number of forecasts to generate (3-20, default: 6)
  usePerplexity?: boolean;  // Whether to use Perplexity for research (default: false)
}
```

### Output Schema
```typescript
{
  probability: number;      // Aggregated probability (0-100)
  description: string;      // Description of the forecast and reasoning
  confidence: 'low' | 'medium' | 'high';  // Based on forecast agreement
  individualForecasts: Array<{
    probability: number;
    reasoning: string;
  }>;
  statistics: {
    mean: number;
    median: number;
    stdDev: number;
    agreement: number;    // % of forecasts within 10 points of median
  };
}
```

## Example

```typescript
const response = await fetch('/api/tools/forecaster', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_TOKEN'
  },
  body: JSON.stringify({
    question: "Will AGI be achieved by 2030?",
    context: "Recent advances in LLMs have accelerated AI progress",
    numForecasts: 6
  })
});

const result = await response.json();
// {
//   success: true,
//   toolId: 'forecaster',
//   result: {
//     probability: 35,
//     description: "Based on 6 independent analyses...",
//     confidence: 'medium',
//     individualForecasts: [...],
//     statistics: {...}
//   }
// }
```

## Cost

Approximately $0.05 per forecast (6 Claude calls).

## Implementation Details

- Uses multiple independent Claude calls to reduce bias
- Removes statistical outliers before aggregation
- Confidence levels based on forecast agreement:
  - High: >66% of forecasts within 10 points of median
  - Medium: 33-66% agreement
  - Low: <33% agreement