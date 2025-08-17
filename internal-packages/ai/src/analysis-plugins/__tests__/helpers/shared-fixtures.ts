import { PluginTestCase } from './test-helpers';
import { spellingDocuments } from '../fixtures/spelling-documents';
import { mathDocuments } from '../fixtures/math-documents';
import { factDocuments } from '../fixtures/fact-documents';
import { forecastDocuments } from '../fixtures/forecast-documents';
import { linkDocuments } from '../fixtures/link-documents';

/**
 * Unified test documents - single source of truth
 * Imports from existing comprehensive fixtures
 */
export const TestDocuments = {
  spelling: spellingDocuments,
  math: mathDocuments,
  facts: factDocuments,
  forecasts: forecastDocuments,
  links: linkDocuments
};

/**
 * Spelling test cases with expectations
 */
export const spellingTestCases: PluginTestCase[] = [
  {
    name: 'detects spelling and grammar errors',
    document: spellingDocuments.withErrors,
    expectations: {
      comments: {
        min: 5,
        max: 20,
        mustFind: ['contians', 'grammer', 'identifyed', 'dont', 'embarassing'],
        verifyHighlights: true
      },
      analysis: {
        summaryContains: ['spelling', 'grammar']
      },
      performance: {
        maxCost: 0.05
      }
    }
  },
  {
    name: 'handles clean documents without false positives',
    document: spellingDocuments.clean,
    expectations: {
      comments: {
        max: 3  // Allow for very minor suggestions
      },
      performance: {
        maxCost: 0.05
      }
    }
  },
  {
    name: 'handles mixed US/UK conventions appropriately',
    document: spellingDocuments.mixedConventions,
    expectations: {
      comments: {
        max: 10  // Some tools might flag convention mixing
      },
      analysis: {
        analysisContains: ['convention', 'spelling']
      },
      performance: {
        maxCost: 0.05
      }
    }
  }
];

/**
 * Math test cases with expectations (from actual test values)
 */
export const mathTestCases: PluginTestCase[] = [
  {
    name: 'detects mathematical errors',
    document: mathDocuments.withErrors,
    expectations: {
      comments: {
        min: 3,
        mustFind: ['1,700,000', '32%', '3.0M'],  // Corrections for the errors
        verifyHighlights: true
      },
      analysis: {
        summaryContains: ['error', 'calculation'],
        minGrade: 0,
        maxGrade: 70  // Should have low grade due to errors
      },
      performance: {
        maxCost: 0.1
      }
    }
  },
  {
    name: 'verifies correct calculations',
    document: mathDocuments.correct,
    expectations: {
      comments: {
        max: 3  // May find minor issues even in correct calculations
      },
      analysis: {
        summaryContains: ['mathematical', 'error'],
        minGrade: 70  // Allow for some minor issues in mostly correct math
      },
      performance: {
        maxCost: 0.1
      }
    }
  },
  {
    name: 'checks unit conversions',
    document: mathDocuments.unitConversions,
    expectations: {
      comments: {
        min: 2,
        mustFind: ['304.8', '6.6', '140'],  // Correct conversion values
        verifyHighlights: true
      },
      analysis: {
        summaryContains: ['conversion', 'unit']
      },
      performance: {
        maxCost: 0.1
      }
    }
  }
];

/**
 * Fact-checking test cases with expectations (from actual test values)
 */
export const factTestCases: PluginTestCase[] = [
  {
    name: 'detects factual errors',
    document: factDocuments.withErrors,
    expectations: {
      comments: {
        min: 4,
        mustFind: ['1945', '1969', '1953'],  // Some correct dates
        verifyHighlights: true
      },
      analysis: {
        summaryContains: ['error', 'incorrect', 'fact'],
        minGrade: 0,
        maxGrade: 60  // Low grade due to errors
      },
      performance: {
        maxCost: 0.15
      }
    }
  },
  {
    name: 'verifies correct facts',
    document: factDocuments.correct,
    expectations: {
      comments: {
        max: 2  // Should find few or no issues
      },
      analysis: {
        summaryContains: ['accurate', 'verified', 'correct'],
        minGrade: 85  // High grade for accurate facts
      },
      performance: {
        maxCost: 0.15
      }
    }
  },
  {
    name: 'handles mixed accuracy documents',
    document: factDocuments.mixedAccuracy || factDocuments.mixed,  // Handle both names
    expectations: {
      comments: {
        min: 2,
        max: 8,
        mustFind: ['2004', '2008'],  // Correct years for Facebook and Bitcoin
        verifyHighlights: true
      },
      analysis: {
        minGrade: 40,
        maxGrade: 70  // Medium grade for mixed accuracy
      },
      performance: {
        maxCost: 0.15
      }
    }
  }
];

/**
 * Forecast test cases with expectations (from actual test values)
 */
export const forecastTestCases: PluginTestCase[] = [
  {
    name: 'identifies clear predictions with probabilities',
    document: forecastDocuments.withPredictions || forecastDocuments.clear,
    expectations: {
      comments: {
        min: 5,
        mustFind: ['70%', '85%', '2027', '2030'],
        verifyHighlights: true
      },
      analysis: {
        summaryContains: ['prediction', 'forecast', 'probability']
      },
      performance: {
        maxCost: 0.1
      }
    }
  },
  {
    name: 'handles vague predictions appropriately',
    document: forecastDocuments.vaguePredictions || forecastDocuments.vague,
    expectations: {
      comments: {
        max: 2  // May find few or no concrete predictions in vague text
      },
      analysis: {
        summaryContains: ['forecasting', 'claims', 'found']
      },
      performance: {
        maxCost: 0.1
      }
    }
  },
  {
    name: 'extracts specific timeline predictions',
    document: forecastDocuments.specificTimelines || forecastDocuments.timeline,
    expectations: {
      comments: {
        min: 8,
        mustFind: ['Q4 2024', 'Q1 2025', '95%', '70%'],
        verifyHighlights: true
      },
      analysis: {
        summaryContains: ['timeline', 'quarterly', 'forecast']
      },
      performance: {
        maxCost: 0.1
      }
    }
  }
];

/**
 * Link analysis test cases with expectations (from actual test values)
 */
export const linkTestCases: PluginTestCase[] = [
  {
    name: 'verifies valid links',
    document: linkDocuments.withValidLinks || linkDocuments.valid,
    expectations: {
      comments: {
        max: 10  // May find some accessibility issues with links
      },
      analysis: {
        summaryContains: ['link', 'working'],
        minGrade: 80  // Good grade for mostly working links
      },
      performance: {
        maxCost: 0.01  // Link checking is cheap (no LLM)
      }
    }
  },
  {
    name: 'detects broken and malformed links',
    document: linkDocuments.withBrokenLinks || linkDocuments.broken,
    expectations: {
      comments: {
        min: 5,
        mustFind: ['broken', 'invalid', 'malformed'],
        verifyHighlights: true
      },
      analysis: {
        summaryContains: ['broken', 'links', 'references'],
        minGrade: 0,
        maxGrade: 50  // Low grade for broken links
      },
      performance: {
        maxCost: 0.01
      }
    }
  },
  {
    name: 'handles documents without links',
    document: linkDocuments.withoutLinks || 'This document contains no links or URLs to check.',
    expectations: {
      comments: {
        exact: 0  // Should find no link issues
      },
      analysis: {
        summaryContains: ['No links', 'no URLs', 'No URLs']
      },
      performance: {
        maxCost: 0.01
      }
    }
  }
];

/**
 * Comprehensive test document that combines multiple error types
 */
export const comprehensiveTestCase: PluginTestCase = {
  name: 'handles documents with multiple error types',
  document: `# Technical Documentation Review

This document contians spelling errors and mathematical calculations.

## Statistics
Our revenue grew from $1000 to $1200, an increase of 15%.
The average response time is (100 + 200 + 300) / 3 = 150ms.

## Historical Context
The first computer bug was found in 1945.
Moore's Law was proposed in 1970.

## Future Predictions
We expect 80% adoption by 2025.
There's a 60% chance of reaching profitability in Q3.

## Resources
Learn more at [https://broken-link.example.com/404](https://broken-link.example.com/404)
Documentation at [https://valid-site.com](https://valid-site.com)

## Conclusion
Despite these erors, the analysis is complete.`,
  expectations: {
    comments: {
      min: 5,  // Should find errors across multiple categories
      verifyHighlights: true
    },
    performance: {
      maxCost: 0.30  // Higher cost for comprehensive analysis
    }
  }
};

/**
 * Helper to get test cases by plugin type
 */
export function getTestCasesForPlugin(pluginName: string): PluginTestCase[] {
  switch (pluginName.toUpperCase()) {
    case 'SPELLING':
      return spellingTestCases;
    case 'MATH':
      return mathTestCases;
    case 'FACT_CHECK':
      return factTestCases;
    case 'FORECAST':
      return forecastTestCases;
    case 'LINK_ANALYSIS':
      return linkTestCases;
    default:
      return [];
  }
}

/**
 * Get all test cases for integration testing
 */
export function getAllTestCases(): PluginTestCase[] {
  return [
    ...spellingTestCases,
    ...mathTestCases,
    ...factTestCases,
    ...forecastTestCases,
    ...linkTestCases,
    comprehensiveTestCase
  ];
}