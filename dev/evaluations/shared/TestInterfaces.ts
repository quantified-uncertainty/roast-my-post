/**
 * Shared interfaces for evaluation test cases and results
 */

/**
 * Base test case structure that all evaluation tools should follow
 */
export interface BaseTestCase<TInput = any, TExpectation = any> {
  id: string;
  category: string;
  name: string;
  input: TInput;
  expectations: TExpectation;
  description: string;
}

/**
 * Base result structure for all test runs
 */
export interface BaseRunResult {
  passed: boolean;
  duration: number;
  failureReasons: string[];
}

/**
 * Math-specific test expectation interface
 */
export interface MathTestExpectation {
  status: 'verified_true' | 'verified_false' | 'cannot_verify';
  errorType?: 'calculation' | 'logic' | 'unit' | 'notation' | 'conceptual';
  minConfidence?: number;
  maxConfidence?: number;
  mustContainInExplanation?: string[];
}

/**
 * Spelling/Grammar-specific test expectation interface
 */
export interface SpellingTestExpectation {
  shouldFindErrors: boolean;
  minErrors?: number;
  maxErrors?: number;
  mustFind?: Array<{
    text: string;
    correction?: string;
    type?: 'spelling' | 'grammar';
    minImportance?: number;
    maxImportance?: number;
  }>;
  mustNotFind?: string[];
}

/**
 * Math-specific run result interface
 */
export interface MathRunResult extends BaseRunResult {
  status: 'verified_true' | 'verified_false' | 'cannot_verify';
  errorType?: string;
  confidence?: number;
  explanation?: string;
  output?: any;
}

/**
 * Spelling/Grammar-specific run result interface
 */
export interface SpellingRunResult extends BaseRunResult {
  errors: any[];
  output: any;
}

/**
 * Test execution statistics
 */
export interface TestExecutionStats {
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  totalDuration: number;
  averageDuration: number;
}