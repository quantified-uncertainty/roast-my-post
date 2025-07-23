# Example Forecast Analysis Output

This is what the generated analysis will look like:

# Forecast Analysis

## Summary

- **Total predictions found**: 5
- **Predictions with author probabilities**: 3
- **Predictions we analyzed**: 2

## Extracted Forecasts

| # | Original Text | Rewritten | Resolution Date | Author % | Our % | Precision | Verifiability | Importance | Robustness |
|---|--------------|----------|----------------|---------|-------|-----------|--------------|------------|------------|
| 1 | AI will surpass human intelligence by 2030 | Will artificial general intelligence surpass h... | 2030-12-31 | N/A | 15% | 80 | 70 | 90 | 60 |
| 2 | There's a 70% chance of recession in 2025 | Will the US enter a recession (two consecutive... | 2025-12-31 | 70% | 65% | 75 | 80 | 85 | 70 |
| 3 | Climate change might accelerate | Will global temperature rise accelerate beyond... | N/A | N/A | N/A | 20 | 30 | 40 | 35 |
| 4 | Bitcoin will reach $100k by end of 2024 | Will Bitcoin price reach $100,000 USD by Decem... | 2024-12-31 | 60% | N/A | 70 | 80 | 50 | 55 |
| 5 | Quantum computing will reach practical appli... | Will quantum computers achieve quantum advanta... | 2028-12-31 | N/A | N/A | 85 | 75 | 90 | 60 |

**Average Scores**: Precision: 66, Verifiability: 67, Importance: 71, Robustness: 56

## Full Forecast Data (JSON)

```json
[
  {
    "index": 1,
    "forecast": {
      "originalText": "AI will surpass human intelligence by 2030",
      "thinking": "Clear technological prediction with specific timeframe",
      "precisionScore": 80,
      "verifiabilityScore": 70,
      "importanceScore": 90,
      "robustnessScore": 60,
      "rewrittenPredictionText": "Will artificial general intelligence surpass human intelligence by 2030?",
      "resolutionDate": "2030-12-31",
      "authorProbability": undefined
    },
    "ourEstimate": {
      "probability": 15,
      "description": "AGI by 2030 seems optimistic given current progress..."
    },
    "scores": {
      "average": 75,
      "shouldGetOurForecast": 74
    }
  },
  {
    "index": 2,
    "forecast": {
      "originalText": "There's a 70% chance of recession in 2025",
      "thinking": "Quantified economic forecast with specific probability and near-term timeline",
      "precisionScore": 75,
      "verifiabilityScore": 80,
      "importanceScore": 85,
      "robustnessScore": 70,
      "rewrittenPredictionText": "Will the US enter a recession (two consecutive quarters of negative GDP growth)?",
      "authorProbability": 70,
      "resolutionDate": "2025-12-31"
    },
    "ourEstimate": {
      "probability": 65,
      "description": "Economic indicators suggest high recession probability..."
    },
    "scores": {
      "average": 77.5,
      "shouldGetOurForecast": 72
    }
  },
  {
    "index": 3,
    "forecast": {
      "originalText": "Climate change might accelerate",
      "thinking": "Vague prediction, not economic focus",
      "precisionScore": 20,
      "verifiabilityScore": 30,
      "importanceScore": 40,
      "robustnessScore": 35,
      "rewrittenPredictionText": "Will global temperature rise accelerate beyond current projections?",
      "resolutionDate": undefined,
      "authorProbability": undefined
    },
    "ourEstimate": null,
    "scores": {
      "average": 31.25,
      "shouldGetOurForecast": 36
    }
  },
  {
    "index": 4,
    "forecast": {
      "originalText": "Bitcoin will reach $100k by end of 2024",
      "thinking": "Specific cryptocurrency prediction with probability and timeframe",
      "precisionScore": 70,
      "verifiabilityScore": 80,
      "importanceScore": 50,
      "robustnessScore": 55,
      "rewrittenPredictionText": "Will Bitcoin price reach $100,000 USD by December 31, 2024?",
      "authorProbability": 60,
      "resolutionDate": "2024-12-31"
    },
    "ourEstimate": null,
    "scores": {
      "average": 63.75,
      "shouldGetOurForecast": 58
    }
  },
  {
    "index": 5,
    "forecast": {
      "originalText": "Quantum computing will reach practical applications by 2028",
      "thinking": "Significant technological prediction with clear timeframe",
      "precisionScore": 85,
      "verifiabilityScore": 75,
      "importanceScore": 90,
      "robustnessScore": 60,
      "rewrittenPredictionText": "Will quantum computers achieve quantum advantage on a practical optimization problem by 2028?",
      "resolutionDate": "2028-12-31",
      "authorProbability": undefined
    },
    "ourEstimate": null,
    "scores": {
      "average": 77.5,
      "shouldGetOurForecast": 74
    }
  }
]
```