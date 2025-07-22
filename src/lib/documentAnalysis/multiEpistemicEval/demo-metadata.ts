/**
 * Demo script to show the plugin metadata structure in multi-epistemic evaluation
 */

// Example of what the metadata section looks like in the final analysis:

const exampleMetadata = {
  "statistics": {
    "totalChunks": 10,
    "totalFindings": 15,
    "findingsByType": {
      "spelling_error": 5,
      "grammar_error": 3,
      "math_error": 2,
      "factual_claim": 3,
      "forecast_claim": 2
    },
    "tokensUsed": 3500,
    "processingTime": 5234
  },
  "recommendations": [
    "Use a spell checker before publishing",
    "Review mathematical calculations for accuracy",
    "Verify factual claims with reliable sources"
  ],
  "plugins": {
    "SPELLING": {
      "summary": "Found 8 spelling and grammar issues across the document",
      "findingsCount": 8,
      "findings": [
        {
          "type": "spelling_error",
          "severity": "low",
          "message": "spelling error: \"recieve\" → \"receive\"",
          "locationHint": {
            "lineNumber": 45,
            "lineText": "We will recieve the results tomorrow",
            "matchText": "recieve"
          }
        },
        // ... more findings
      ],
      "recommendations": ["Use spell checker"],
      "llmCallsCount": 2,
      "tokensUsed": 850
    },
    "MATH": {
      "summary": "Identified 2 potential calculation errors",
      "findingsCount": 2,
      "findings": [
        {
          "type": "math_error",
          "severity": "medium",
          "message": "Calculation result doesn't match: 15 * 3 = 45, not 48",
          "locationHint": {
            "lineNumber": 123,
            "lineText": "The total is 15 * 3 = 48",
            "matchText": "15 * 3 = 48"
          }
        }
      ],
      "recommendations": ["Double-check calculations"],
      "llmCallsCount": 1,
      "tokensUsed": 450
    },
    "FACT_CHECK": {
      "summary": "Found 3 factual claims requiring verification",
      "findingsCount": 3,
      "findings": [
        {
          "type": "factual_claim",
          "severity": "info",
          "message": "Claim requires verification: \"The population of Paris is 5 million\"",
          "metadata": {
            "claim": "The population of Paris is 5 million",
            "confidence": "medium"
          }
        }
      ],
      "recommendations": ["Verify population statistics with official sources"],
      "llmCallsCount": 3,
      "tokensUsed": 1200
    },
    "FORECAST": {
      "summary": "Identified 2 forecasting claims",
      "findingsCount": 2,
      "findings": [
        {
          "type": "forecast_claim",
          "severity": "info",
          "message": "Forecast: \"AI will surpass human intelligence by 2030\"",
          "metadata": {
            "timeframe": "2030",
            "confidence": "low",
            "type": "technological"
          }
        }
      ],
      "recommendations": ["Consider adding confidence intervals to predictions"],
      "llmCallsCount": 1,
      "tokensUsed": 1000
    }
  }
};


export { exampleMetadata };