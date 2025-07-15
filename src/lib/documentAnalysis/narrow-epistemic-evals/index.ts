/**
 * Narrow Epistemic Evaluations
 * Export main functionality for easier imports
 */

// Math Error Checker
export {
  analyzeMathChunk,
  splitIntoChunks,
  type MathError,
  type TextChunk,
  type AnalysisResult
} from './mathChecker';

export {
  advancedTestCases,
  subtleErrorCases
} from './advancedMathTestCases';

// Fact Checker  
export {
  extractVerifiableClaims,
  generateSearchQueries,
  assessSourceCredibility,
  determineVerdict,
  type FactCheckResult,
  type FactCheckError
} from './factChecker';

// Test Infrastructure
export { runTestSuite, fuzzyMatch, displayDetailedResults } from './tests/shared/testRunner';
export type { TestCase, TestSuite, TestResult } from './tests/shared/testRunner';

// Forecaster
export {
  extractForecasts,
  generateForecast,
  getForecast,
  type ForecastingQuestion,
  type ForecastResponse,
  type AggregatedForecast,
  type ExtractedForecast
} from './forecaster';

// Test Suites
export { 
  basicMathTestSuite, 
  advancedMathTestSuite, 
  edgeCaseTestSuite 
} from './tests/math/mathTestCases';

export {
  currentFactsTestSuite,
  historicalFactsTestSuite,
  mixedClaimsTestSuite,
  edgeCaseFactsTestSuite
} from './tests/factcheck/factCheckTestCases';

export {
  forecastExtractionTestSuite,
  forecastGenerationTestSuite,
  forecastEdgeCasesTestSuite
} from './tests/forecasting/forecastingTestCases';