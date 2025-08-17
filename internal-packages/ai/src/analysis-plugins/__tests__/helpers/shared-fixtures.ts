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
 * Math test cases with expectations
 */
export const mathTestCases: PluginTestCase[] = [
  {
    name: 'detects calculation errors',
    document: mathDocuments.withErrors,
    expectations: {
      comments: {
        min: 3,
        max: 10,
        mustFind: ['600', '90', '20%'],
        verifyHighlights: true
      },
      analysis: {
        summaryContains: ['calculation', 'math']
      },
      performance: {
        maxCost: 0.10
      }
    }
  },
  {
    name: 'handles correct calculations without false positives',
    document: mathDocuments.correct,
    expectations: {
      comments: {
        max: 2
      },
      performance: {
        maxCost: 0.10
      }
    }
  },
  {
    name: 'verifies unit conversions',
    document: mathDocuments.unitConversions,
    expectations: {
      comments: {
        min: 2,  // Should find the incorrect conversions
        mustFind: ['10 inches', '1 kilogram']
      },
      analysis: {
        summaryContains: ['conversion', 'unit']
      },
      performance: {
        maxCost: 0.10
      }
    }
  }
];

/**
 * Fact-checking test cases with expectations
 */
export const factTestCases: PluginTestCase[] = [
  {
    name: 'detects factual errors',
    document: factDocuments.withErrors,
    expectations: {
      comments: {
        min: 3,
        max: 10,
        mustFind: ['1969', 'Watson', 'Crick', 'Paul Allen'],
        verifyHighlights: true
      },
      analysis: {
        summaryContains: ['fact', 'error', 'incorrect']
      },
      performance: {
        maxCost: 0.15
      }
    }
  },
  {
    name: 'handles correct facts without false positives',
    document: factDocuments.correct,
    expectations: {
      comments: {
        max: 2
      },
      performance: {
        maxCost: 0.15
      }
    }
  },
  {
    name: 'handles mixed correct and incorrect facts',
    document: factDocuments.mixed,
    expectations: {
      comments: {
        min: 1,
        max: 5,
        mustFind: ['2004']  // Facebook founding year
      },
      performance: {
        maxCost: 0.15
      }
    }
  }
];

/**
 * Forecast test cases with expectations
 */
export const forecastTestCases: PluginTestCase[] = [
  {
    name: 'identifies clear predictions',
    document: forecastDocuments.clear,
    expectations: {
      comments: {
        min: 3,
        max: 10,
        mustFind: ['70%', '90%', '30%']
      },
      analysis: {
        summaryContains: ['prediction', 'forecast', 'probability']
      },
      performance: {
        maxCost: 0.10
      }
    }
  },
  {
    name: 'handles vague predictions appropriately',
    document: forecastDocuments.vague,
    expectations: {
      comments: {
        max: 5  // Should identify vagueness but not over-comment
      },
      analysis: {
        analysisContains: ['vague', 'specific']
      },
      performance: {
        maxCost: 0.10
      }
    }
  },
  {
    name: 'analyzes timeline-based forecasts',
    document: forecastDocuments.timeline,
    expectations: {
      comments: {
        min: 3,
        mustFind: ['95%', '80%', '60%', 'Q4 2024', 'Q1 2025']
      },
      analysis: {
        summaryContains: ['timeline', 'confidence']
      },
      performance: {
        maxCost: 0.10
      }
    }
  }
];

/**
 * Link analysis test cases with expectations
 */
export const linkTestCases: PluginTestCase[] = [
  {
    name: 'validates correct links',
    document: linkDocuments.valid,
    expectations: {
      comments: {
        max: 1  // Should not flag valid links
      },
      performance: {
        maxCost: 0.05
      }
    }
  },
  {
    name: 'detects broken and suspicious links',
    document: linkDocuments.broken,
    expectations: {
      comments: {
        min: 2,
        max: 6,
        mustFind: ['404', 'invalid', 'broken']
      },
      analysis: {
        summaryContains: ['broken', 'link', 'invalid']
      },
      performance: {
        maxCost: 0.05
      }
    }
  },
  {
    name: 'identifies malformed URLs',
    document: linkDocuments.malformed,
    expectations: {
      comments: {
        min: 2,
        mustFind: ['htp://', 'malformed', 'incomplete']
      },
      analysis: {
        summaryContains: ['malformed', 'URL', 'format']
      },
      performance: {
        maxCost: 0.05
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