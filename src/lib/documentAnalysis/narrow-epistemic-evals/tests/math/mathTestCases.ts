/**
 * Clean input/output test cases for math error checking
 */

import type { TestCase, TestSuite } from '../shared/testRunner';
import type { MathError } from '../../mathChecker';

export interface MathTestInput {
  text: string;
  chunkSize?: number;
}

export interface MathTestExpected {
  errorCount: number;
  errors: Array<{
    highlightedText: string;
    errorType: 'calculation' | 'logic' | 'unit' | 'notation' | 'conceptual';
    severity: 'critical' | 'major' | 'minor';
    descriptionContains?: string; // Partial match for description
  }>;
}

export const basicMathTestSuite: TestSuite<MathTestInput, MathTestExpected> = {
  name: "Basic Math Error Detection",
  description: "Tests fundamental arithmetic and calculation error detection",
  testCases: [
    {
      id: "basic-arithmetic-001",
      description: "Simple addition error",
      input: {
        text: "In our calculation, we found that 2 + 2 = 5."
      },
      expected: {
        errorCount: 1,
        errors: [{
          highlightedText: "2 + 2 = 5",
          errorType: "calculation",
          severity: "critical",
          descriptionContains: "2 + 2 = 4"
        }]
      }
    },
    
    {
      id: "percentage-001", 
      description: "Percentage calculation error",
      input: {
        text: "The company's revenue grew by 50% from $2 million to $3.5 million."
      },
      expected: {
        errorCount: 1,
        errors: [{
          highlightedText: "revenue grew by 50% from $2 million to $3.5 million",
          errorType: "calculation", 
          severity: "major",
          descriptionContains: "75%"
        }]
      }
    },
    
    {
      id: "percentage-002",
      description: "Simple percentage of calculation",
      input: {
        text: "We calculated that 15% of 200 equals 35."
      },
      expected: {
        errorCount: 1,
        errors: [{
          highlightedText: "15% of 200 equals 35",
          errorType: "calculation",
          severity: "major", 
          descriptionContains: "30"
        }]
      }
    },
    
    {
      id: "probability-001",
      description: "Probability misconception",
      input: {
        text: "If we flip a coin 10 times, we will definitely get exactly 5 heads."
      },
      expected: {
        errorCount: 1,
        errors: [{
          highlightedText: "we will definitely get exactly 5 heads",
          errorType: "logic",
          severity: "minor",
          descriptionContains: "probability"
        }]
      }
    },
    
    {
      id: "correct-math-001",
      description: "Correct mathematical statement",
      input: {
        text: "The Pythagorean theorem states that a² + b² = c² for right triangles."
      },
      expected: {
        errorCount: 0,
        errors: []
      }
    },
    
    {
      id: "unit-conversion-001", 
      description: "Unit conversion error",
      input: {
        text: "The distance is 5 kilometers, which equals 5,000 meters."
      },
      expected: {
        errorCount: 0, // This is actually correct
        errors: []
      }
    },
    
    {
      id: "unit-conversion-002",
      description: "Incorrect unit conversion", 
      input: {
        text: "One mile equals 1,000 meters."
      },
      expected: {
        errorCount: 1,
        errors: [{
          highlightedText: "One mile equals 1,000 meters",
          errorType: "unit",
          severity: "major",
          descriptionContains: "1,609"
        }]
      }
    }
  ]
};

export const advancedMathTestSuite: TestSuite<MathTestInput, MathTestExpected> = {
  name: "Advanced Math Error Detection", 
  description: "Tests complex mathematical concepts and subtle errors",
  testCases: [
    {
      id: "calculus-001",
      description: "Derivative error",
      input: {
        text: "The derivative of x³ is 3x."
      },
      expected: {
        errorCount: 1,
        errors: [{
          highlightedText: "derivative of x³ is 3x",
          errorType: "calculation",
          severity: "major",
          descriptionContains: "3x²"
        }]
      }
    },
    
    {
      id: "calculus-002", 
      description: "Integration error",
      input: {
        text: "The integral of 2x is x² + C."
      },
      expected: {
        errorCount: 1,
        errors: [{
          highlightedText: "integral of 2x is x² + C", 
          errorType: "calculation",
          severity: "major",
          descriptionContains: "x²"
        }]
      }
    },
    
    {
      id: "statistics-001",
      description: "Statistical reasoning error",
      input: {
        text: "The mean of [2, 4, 6, 8, 10] is 5."
      },
      expected: {
        errorCount: 1,
        errors: [{
          highlightedText: "mean of [2, 4, 6, 8, 10] is 5",
          errorType: "calculation", 
          severity: "major",
          descriptionContains: "6"
        }]
      }
    },
    
    {
      id: "probability-advanced-001",
      description: "Dice probability error",
      input: {
        text: "The probability of rolling a 6 twice in a row is 1/12."
      },
      expected: {
        errorCount: 1,
        errors: [{
          highlightedText: "probability of rolling a 6 twice in a row is 1/12",
          errorType: "calculation",
          severity: "major", 
          descriptionContains: "1/36"
        }]
      }
    },
    
    {
      id: "algebra-001",
      description: "Equation solving error",
      input: {
        text: "Solving x² - 5x + 6 = 0, we get x = 2 and x = 4."
      },
      expected: {
        errorCount: 1,
        errors: [{
          highlightedText: "x = 2 and x = 4",
          errorType: "calculation",
          severity: "major",
          descriptionContains: "x = 2 and x = 3"
        }]
      }
    },
    
    {
      id: "approximation-001",
      description: "Reasonable approximation (should be accepted)",
      input: {
        text: "For quick calculations, we can use π ≈ 3.14."
      },
      expected: {
        errorCount: 0,
        errors: []
      }
    },
    
    {
      id: "approximation-002", 
      description: "Poor approximation",
      input: {
        text: "We estimate that π ≈ 3.0 for our calculations."
      },
      expected: {
        errorCount: 1,
        errors: [{
          highlightedText: "π ≈ 3.0",
          errorType: "calculation",
          severity: "minor",
          descriptionContains: "3.14"
        }]
      }
    }
  ]
};

export const edgeCaseTestSuite: TestSuite<MathTestInput, MathTestExpected> = {
  name: "Edge Cases and Context-Dependent Math",
  description: "Tests mathematical statements that depend on context or are borderline cases",
  testCases: [
    {
      id: "context-001",
      description: "Context-dependent approximation",
      input: {
        text: "For engineering estimates, we use g = 10 m/s² instead of 9.8 m/s²."
      },
      expected: {
        errorCount: 0, // Should accept reasonable engineering approximation
        errors: []
      }
    },
    
    {
      id: "notation-001",
      description: "Ambiguous mathematical notation",
      input: {
        text: "The expression 6/2(1+2) equals 1."
      },
      expected: {
        errorCount: 1,
        errors: [{
          highlightedText: "6/2(1+2) equals 1",
          errorType: "notation",
          severity: "major",
          descriptionContains: "9"
        }]
      }
    },
    
    {
      id: "infinite-series-001",
      description: "Series convergence error",
      input: {
        text: "The harmonic series 1 + 1/2 + 1/3 + ... converges to 2."
      },
      expected: {
        errorCount: 1,
        errors: [{
          highlightedText: "harmonic series 1 + 1/2 + 1/3 + ... converges to 2",
          errorType: "conceptual",
          severity: "major",
          descriptionContains: "diverges"
        }]
      }
    },
    
    {
      id: "geometry-001",
      description: "Geometric theorem misapplication",
      input: {
        text: "For any triangle, a² + b² = c²."
      },
      expected: {
        errorCount: 1,
        errors: [{
          highlightedText: "For any triangle, a² + b² = c²",
          errorType: "conceptual", 
          severity: "major",
          descriptionContains: "right triangle"
        }]
      }
    },
    
    {
      id: "calculus-limit-001",
      description: "Limit evaluation",
      input: {
        text: "The limit of sin(x)/x as x approaches 0 is 1."
      },
      expected: {
        errorCount: 0, // This is correct
        errors: []
      }
    },
    
    {
      id: "multiple-errors-001",
      description: "Text with multiple mathematical errors",
      input: {
        text: "In our study, we found that 2 + 2 = 5 and 15% of 200 equals 35. Also, the probability of rolling a 6 is 1/12."
      },
      expected: {
        errorCount: 3,
        errors: [
          {
            highlightedText: "2 + 2 = 5",
            errorType: "calculation",
            severity: "critical"
          },
          {
            highlightedText: "15% of 200 equals 35", 
            errorType: "calculation",
            severity: "major"
          },
          {
            highlightedText: "probability of rolling a 6 is 1/12",
            errorType: "calculation", 
            severity: "major"
          }
        ]
      }
    }
  ]
};