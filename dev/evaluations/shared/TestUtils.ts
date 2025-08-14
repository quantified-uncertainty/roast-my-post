import { BaseTestCase, BaseRunResult, TestExecutionStats } from './TestInterfaces';

/**
 * Common utility functions for test validation and reporting
 */
export class TestUtils {
  /**
   * Validates that a test case has all required fields
   */
  static validateTestCase<T extends BaseTestCase>(testCase: T): boolean {
    const required = ['id', 'category', 'name', 'input', 'expectations', 'description'];
    for (const field of required) {
      if (!(field in testCase) || testCase[field as keyof T] === undefined) {
        console.error(`Test case ${testCase.id || 'unknown'} missing required field: ${field}`);
        return false;
      }
    }
    return true;
  }

  /**
   * Calculates execution statistics from test results
   */
  static calculateStats(results: BaseRunResult[]): TestExecutionStats {
    const totalTests = results.length;
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    const skipped = 0; // Could be extended for skipped tests
    const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
    const averageDuration = totalTests > 0 ? totalDuration / totalTests : 0;

    return {
      totalTests,
      passed,
      failed,
      skipped,
      totalDuration,
      averageDuration
    };
  }

  /**
   * Formats test results for console output
   */
  static formatResults(stats: TestExecutionStats): string {
    const passRate = stats.totalTests > 0 ? (stats.passed / stats.totalTests * 100).toFixed(1) : '0.0';
    
    return `
Test Results Summary:
=====================
Total Tests: ${stats.totalTests}
✅ Passed: ${stats.passed} (${passRate}%)
❌ Failed: ${stats.failed}
⏱️  Total Duration: ${(stats.totalDuration / 1000).toFixed(2)}s
📊 Average Duration: ${(stats.averageDuration / 1000).toFixed(3)}s per test
`;
  }

  /**
   * Groups test cases by category for organized reporting
   */
  static groupByCategory<T extends BaseTestCase>(testCases: T[]): Map<string, T[]> {
    return testCases.reduce((groups, testCase) => {
      const category = testCase.category;
      if (!groups.has(category)) {
        groups.set(category, []);
      }
      groups.get(category)!.push(testCase);
      return groups;
    }, new Map<string, T[]>());
  }

  /**
   * Filters test cases by category or name pattern
   */
  static filterTests<T extends BaseTestCase>(
    testCases: T[], 
    categoryFilter?: string, 
    namePattern?: RegExp
  ): T[] {
    return testCases.filter(testCase => {
      if (categoryFilter && testCase.category !== categoryFilter) {
        return false;
      }
      if (namePattern && !namePattern.test(testCase.name)) {
        return false;
      }
      return true;
    });
  }

  /**
   * Creates a unique test run ID for tracking
   */
  static generateRunId(): string {
    return `run-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Logs test progress with consistent formatting
   */
  static logProgress(current: number, total: number, testName: string): void {
    const progress = ((current / total) * 100).toFixed(1);
    console.log(`[${current}/${total}] (${progress}%) Running: ${testName}`);
  }
}