/**
 * Clean input/output test cases for fact checking
 */

import type { TestCase, TestSuite } from '../shared/testRunner';

export interface FactCheckTestInput {
  text: string;
  claims?: string[]; // Optional: pre-extracted claims to check
}

export interface FactCheckTestExpected {
  claimsFound: number;
  verificationResults: Array<{
    claim: string;
    verdict: 'TRUE' | 'FALSE' | 'PARTIALLY_TRUE' | 'MISLEADING' | 'UNVERIFIABLE';
    confidenceRange: [number, number]; // Min and max acceptable confidence
    evidenceCategories: ('supporting' | 'contradicting')[];
    sourceTypes?: string[]; // Expected types of sources
  }>;
}

export const currentFactsTestSuite: TestSuite<FactCheckTestInput, FactCheckTestExpected> = {
  name: "Current Facts Verification",
  description: "Tests fact checking of claims requiring current web search data",
  testCases: [
    {
      id: "market-cap-001",
      description: "NVIDIA market cap claim (requires current financial data)",
      input: {
        text: "NVIDIA's market cap exceeded $3 trillion in 2024, making it one of the world's most valuable companies."
      },
      expected: {
        claimsFound: 1,
        verificationResults: [{
          claim: "NVIDIA's market cap exceeded $3 trillion in 2024",
          verdict: "TRUE", // As of 2024, this became true
          confidenceRange: [0.7, 1.0],
          evidenceCategories: ['supporting'],
          sourceTypes: ['finance', 'news']
        }]
      }
    },
    
    {
      id: "crypto-price-001", 
      description: "Bitcoin price claim (requires current market data)",
      input: {
        text: "Bitcoin is currently trading above $100,000 per coin."
      },
      expected: {
        claimsFound: 1,
        verificationResults: [{
          claim: "Bitcoin is currently trading above $100,000 per coin",
          verdict: "FALSE", // As of July 2025, Bitcoin has not reached $100k
          confidenceRange: [0.6, 1.0],
          evidenceCategories: ['contradicting'],
          sourceTypes: ['crypto', 'finance']
        }]
      }
    },
    
    {
      id: "population-001",
      description: "Current population claim",
      input: {
        text: "India's population surpassed 1.4 billion people in 2023."
      },
      expected: {
        claimsFound: 1,
        verificationResults: [{
          claim: "India's population surpassed 1.4 billion people in 2023",
          verdict: "TRUE",
          confidenceRange: [0.8, 1.0],
          evidenceCategories: ['supporting'],
          sourceTypes: ['demographic', 'government', 'international']
        }]
      }
    },
    
    {
      id: "tech-release-001",
      description: "Technology release claim",
      input: {
        text: "OpenAI released GPT-5 in early 2025 with major improvements."
      },
      expected: {
        claimsFound: 1,
        verificationResults: [{
          claim: "OpenAI released GPT-5 in early 2025",
          verdict: "FALSE", // As of July 2025, GPT-5 has not been released
          confidenceRange: [0.7, 1.0],
          evidenceCategories: ['contradicting'],
          sourceTypes: ['tech', 'official']
        }]
      }
    },
    
    {
      id: "nobel-prize-001",
      description: "Recent Nobel Prize information",
      input: {
        text: "The 2024 Nobel Prize in Physics was awarded for discoveries in machine learning."
      },
      expected: {
        claimsFound: 1,
        verificationResults: [{
          claim: "2024 Nobel Prize in Physics was awarded for discoveries in machine learning",
          verdict: "TRUE", // Geoffrey Hinton and John Hopfield won for neural networks
          confidenceRange: [0.8, 1.0],
          evidenceCategories: ['supporting'],
          sourceTypes: ['official', 'academic']
        }]
      }
    },
    
    {
      id: "stock-price-001",
      description: "Stock price claim",
      input: {
        text: "Tesla's stock price is currently above $300 per share."
      },
      expected: {
        claimsFound: 1,
        verificationResults: [{
          claim: "Tesla's stock price is currently above $300 per share",
          verdict: "FALSE", // TSLA typically trades below $300
          confidenceRange: [0.6, 1.0],
          evidenceCategories: ['contradicting'],
          sourceTypes: ['finance', 'market']
        }]
      }
    }
  ]
};

export const historicalFactsTestSuite: TestSuite<FactCheckTestInput, FactCheckTestExpected> = {
  name: "Historical Facts Verification",
  description: "Tests fact checking of established historical claims (baseline for comparison)",
  testCases: [
    {
      id: "historical-001",
      description: "Basic historical fact",
      input: {
        text: "The United States declared independence in 1776."
      },
      expected: {
        claimsFound: 1,
        verificationResults: [{
          claim: "United States declared independence in 1776",
          verdict: "TRUE",
          confidenceRange: [0.9, 1.0],
          evidenceCategories: ['supporting'],
          sourceTypes: ['historical', 'educational']
        }]
      }
    },
    
    {
      id: "historical-false-001",
      description: "False historical claim",
      input: {
        text: "World War II ended in 1944."
      },
      expected: {
        claimsFound: 1,
        verificationResults: [{
          claim: "World War II ended in 1944",
          verdict: "FALSE",
          confidenceRange: [0.8, 1.0],
          evidenceCategories: ['contradicting'],
          sourceTypes: ['historical', 'educational']
        }]
      }
    },
    
    {
      id: "science-fact-001",
      description: "Scientific fact",
      input: {
        text: "Water boils at 100 degrees Celsius at sea level."
      },
      expected: {
        claimsFound: 1,
        verificationResults: [{
          claim: "Water boils at 100 degrees Celsius at sea level",
          verdict: "TRUE",
          confidenceRange: [0.9, 1.0],
          evidenceCategories: ['supporting'],
          sourceTypes: ['scientific', 'educational']
        }]
      }
    }
  ]
};

export const mixedClaimsTestSuite: TestSuite<FactCheckTestInput, FactCheckTestExpected> = {
  name: "Mixed Claims Analysis",
  description: "Tests extraction and verification of multiple claims in single text",
  testCases: [
    {
      id: "mixed-001",
      description: "Text with multiple claims of different types",
      input: {
        text: `Recent market analysis shows that NVIDIA's market cap reached $3 trillion in 2024. 
               The company was founded in 1993 and has been a leader in GPU technology. 
               Bitcoin currently trades above $150,000, setting new records.
               The United States has 50 states, with Hawaii being the most recent addition in 1959.`
      },
      expected: {
        claimsFound: 4,
        verificationResults: [
          {
            claim: "NVIDIA's market cap reached $3 trillion in 2024",
            verdict: "TRUE",
            confidenceRange: [0.7, 1.0],
            evidenceCategories: ['supporting']
          },
          {
            claim: "NVIDIA was founded in 1993",
            verdict: "TRUE",
            confidenceRange: [0.8, 1.0],
            evidenceCategories: ['supporting']
          },
          {
            claim: "Bitcoin currently trades above $150,000",
            verdict: "FALSE",
            confidenceRange: [0.8, 1.0],
            evidenceCategories: ['contradicting']
          },
          {
            claim: "United States has 50 states",
            verdict: "TRUE",
            confidenceRange: [0.9, 1.0],
            evidenceCategories: ['supporting']
          }
        ]
      }
    },
    
    {
      id: "mixed-002",
      description: "Technical claims requiring verification",
      input: {
        text: `The latest iPhone model was released in September 2024 with significant AI improvements.
               Apple's market cap fluctuates but has exceeded $4 trillion recently.
               The company was founded by Steve Jobs, Steve Wozniak, and Ronald Wayne in 1976.`
      },
      expected: {
        claimsFound: 3,
        verificationResults: [
          {
            claim: "latest iPhone model was released in September 2024",
            verdict: "TRUE",
            confidenceRange: [0.7, 1.0],
            evidenceCategories: ['supporting']
          },
          {
            claim: "Apple's market cap has exceeded $4 trillion",
            verdict: "FALSE", // As of 2025, Apple hasn't reached $4T consistently
            confidenceRange: [0.6, 1.0],
            evidenceCategories: ['contradicting']
          },
          {
            claim: "Apple founded by Jobs, Wozniak, and Wayne in 1976",
            verdict: "TRUE",
            confidenceRange: [0.9, 1.0],
            evidenceCategories: ['supporting']
          }
        ]
      }
    }
  ]
};

export const edgeCaseFactsTestSuite: TestSuite<FactCheckTestInput, FactCheckTestExpected> = {
  name: "Edge Cases and Ambiguous Claims",
  description: "Tests handling of difficult-to-verify or context-dependent claims",
  testCases: [
    {
      id: "edge-001",
      description: "Ambiguous timeframe claim",
      input: {
        text: "The stock market reached all-time highs recently."
      },
      expected: {
        claimsFound: 1,
        verificationResults: [{
          claim: "stock market reached all-time highs recently",
          verdict: "PARTIALLY_TRUE", // Depends on timeframe and index
          confidenceRange: [0.3, 0.7],
          evidenceCategories: ['supporting'],
          sourceTypes: ['finance']
        }]
      }
    },
    
    {
      id: "edge-002",
      description: "Subjective claim",
      input: {
        text: "Tesla makes the best electric cars in the world."
      },
      expected: {
        claimsFound: 1,
        verificationResults: [{
          claim: "Tesla makes the best electric cars in the world",
          verdict: "UNVERIFIABLE", // Subjective claim
          confidenceRange: [0.1, 0.4],
          evidenceCategories: [],
          sourceTypes: []
        }]
      }
    },
    
    {
      id: "edge-003",
      description: "Rapidly changing claim",
      input: {
        text: "The current weather in New York is sunny."
      },
      expected: {
        claimsFound: 1,
        verificationResults: [{
          claim: "current weather in New York is sunny",
          verdict: "UNVERIFIABLE", // Too specific and time-sensitive
          confidenceRange: [0.1, 0.5],
          evidenceCategories: [],
          sourceTypes: []
        }]
      }
    },
    
    {
      id: "edge-004",
      description: "Precise numerical claim requiring verification",
      input: {
        text: "The current exchange rate is 1.08 USD per Euro."
      },
      expected: {
        claimsFound: 1,
        verificationResults: [{
          claim: "exchange rate is 1.08 USD per Euro",
          verdict: "PARTIALLY_TRUE", // Close to typical rates but fluctuates
          confidenceRange: [0.4, 0.8],
          evidenceCategories: ['supporting'],
          sourceTypes: ['finance']
        }]
      }
    }
  ]
};