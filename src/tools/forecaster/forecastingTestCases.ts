/**
 * Test cases for forecasting module
 */

import type { TestSuite } from '../base/testRunner';

// Test input types
export interface ForecastExtractionInput {
  text: string;
}

export interface ForecastGenerationInput {
  question: string;
  context?: string;
  timeframe?: string;
}

// Expected output types
export interface ForecastExtractionExpected {
  forecastsFound: number;
  forecasts: Array<{
    topicIncludes: string[];
    probabilityRange?: [number, number];
    hasTimeframe?: boolean;
  }>;
}

export interface ForecastGenerationExpected {
  probabilityRange: [number, number];
  confidenceLevel: 'low' | 'medium' | 'high' | 'any';
  descriptionContains?: string[];
  keyFactorsInclude?: string[];
}

// Forecast extraction test suite
export const forecastExtractionTestSuite: TestSuite<ForecastExtractionInput, ForecastExtractionExpected> = {
  name: "Forecast Extraction",
  description: "Tests extraction of forecast-like statements from text",
  testCases: [
    {
      id: "extract-001",
      description: "Simple probability forecast",
      input: {
        text: "I believe there's a 70% chance that AI will achieve human-level performance on most cognitive tasks by 2030."
      },
      expected: {
        forecastsFound: 1,
        forecasts: [{
          topicIncludes: ["AI", "human-level", "cognitive"],
          probabilityRange: [65, 75],
          hasTimeframe: true
        }]
      }
    },
    
    {
      id: "extract-002",
      description: "Multiple forecasts in text",
      input: {
        text: `Market analysts predict that Tesla stock will likely reach $400 by end of 2025. 
               There's also a strong possibility (around 80%) that electric vehicles will represent 
               over 50% of new car sales by 2030. However, full self-driving capabilities might 
               not be widely available until 2027 or later.`
      },
      expected: {
        forecastsFound: 3,
        forecasts: [
          {
            topicIncludes: ["Tesla", "stock", "$400"],
            hasTimeframe: true
          },
          {
            topicIncludes: ["electric vehicles", "sales"],
            probabilityRange: [75, 85],
            hasTimeframe: true
          },
          {
            topicIncludes: ["self-driving"],
            hasTimeframe: true
          }
        ]
      }
    },
    
    {
      id: "extract-003",
      description: "Implicit forecasts without explicit probabilities",
      input: {
        text: "Climate scientists warn that global temperatures will almost certainly rise by at least 1.5°C above pre-industrial levels within the next decade."
      },
      expected: {
        forecastsFound: 1,
        forecasts: [{
          topicIncludes: ["temperature", "1.5°C", "climate"],
          hasTimeframe: true
        }]
      }
    },
    
    {
      id: "extract-004",
      description: "No forecasts in descriptive text",
      input: {
        text: "The company was founded in 2010 and has grown steadily since then. Current revenue stands at $50 million with 200 employees across three offices."
      },
      expected: {
        forecastsFound: 0,
        forecasts: []
      }
    }
  ]
};

// Forecast generation test suite
export const forecastGenerationTestSuite: TestSuite<ForecastGenerationInput, ForecastGenerationExpected> = {
  name: "Forecast Generation",
  description: "Tests generation of forecasts using multiple Claude calls",
  testCases: [
    {
      id: "generate-001",
      description: "Near-term technology forecast",
      input: {
        question: "Will OpenAI release GPT-5 before the end of 2025?",
        timeframe: "By December 31, 2025"
      },
      expected: {
        probabilityRange: [20, 60], // Wide range as this is uncertain
        confidenceLevel: 'any',
        descriptionContains: ["6 independent analyses"],
        keyFactorsInclude: ["OpenAI", "GPT", "release"]
      }
    },
    
    {
      id: "generate-002",
      description: "Economic forecast with context",
      input: {
        question: "Will the US enter a recession in 2025?",
        context: "Current inflation is moderating, unemployment remains low at 3.7%, and the Fed has paused rate hikes.",
        timeframe: "Calendar year 2025"
      },
      expected: {
        probabilityRange: [15, 45],
        confidenceLevel: 'any',
        descriptionContains: ["6 independent analyses"],
        keyFactorsInclude: ["inflation", "unemployment", "Fed", "economic"]
      }
    },
    
    {
      id: "generate-003",
      description: "Long-term climate forecast",
      input: {
        question: "Will global average temperature increase exceed 2°C above pre-industrial levels by 2050?",
        timeframe: "By 2050"
      },
      expected: {
        probabilityRange: [60, 85],
        confidenceLevel: 'any',
        descriptionContains: ["6 independent analyses"],
        keyFactorsInclude: ["climate", "temperature", "emissions"]
      }
    },
    
    {
      id: "generate-004",
      description: "High-confidence near-certain event",
      input: {
        question: "Will the sun rise tomorrow?",
        timeframe: "Next 24 hours"
      },
      expected: {
        probabilityRange: [99, 100],
        confidenceLevel: 'high',
        descriptionContains: ["strong agreement", "6 independent analyses"]
      }
    },
    
    {
      id: "generate-005",
      description: "Highly uncertain far-future event",
      input: {
        question: "Will humans establish a permanent colony on Mars with over 1000 residents?",
        timeframe: "By 2100"
      },
      expected: {
        probabilityRange: [5, 40], // Wide range for uncertainty
        confidenceLevel: 'any',
        descriptionContains: ["6 independent analyses"],
        keyFactorsInclude: ["Mars", "space", "technology"]
      }
    }
  ]
};

// Edge cases test suite
export const forecastEdgeCasesTestSuite: TestSuite<ForecastGenerationInput, ForecastGenerationExpected> = {
  name: "Forecast Edge Cases",
  description: "Tests handling of ambiguous or difficult forecasting questions",
  testCases: [
    {
      id: "edge-001",
      description: "Ambiguous question without clear resolution criteria",
      input: {
        question: "Will AI be beneficial for humanity?",
        timeframe: "Next 50 years"
      },
      expected: {
        probabilityRange: [30, 70], // Should show high uncertainty
        confidenceLevel: 'low',
        descriptionContains: ["disagreement", "6 independent analyses"]
      }
    },
    
    {
      id: "edge-002",
      description: "Question about past event (should handle gracefully)",
      input: {
        question: "Did the Apollo 11 mission successfully land on the moon?",
        context: "This is a historical question about 1969"
      },
      expected: {
        probabilityRange: [95, 100], // Should recognize as historical fact
        confidenceLevel: 'high',
        descriptionContains: ["6 independent analyses"]
      }
    },
    
    {
      id: "edge-003",
      description: "Paradoxical or impossible question",
      input: {
        question: "Will this statement be false?",
        timeframe: "Immediately"
      },
      expected: {
        probabilityRange: [0, 100], // Very wide range
        confidenceLevel: 'low',
        descriptionContains: ["disagreement", "6 independent analyses"]
      }
    }
  ]
};