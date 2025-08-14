import { v4 as uuidv4 } from "uuid";

import { logger } from "../../../../internal-packages/ai/src/shared/logger";
import { checkMathWithMathJsTool } from "../../../../internal-packages/ai/src/tools/check-math-with-mathjs";
import type { TestCase } from "../../data/check-math-with-mathjs/test-cases";
import { BaseRunner } from "../../shared/BaseRunner";
import { MathRunResult } from "../../shared/TestInterfaces";

export interface RunResult extends MathRunResult {
  explanation: string;
}

export interface TestResult {
  testCase: TestCase;
  runs: RunResult[];
  overallPassed: boolean;
  consistencyScore: number;
}

export interface EvaluationResult {
  metadata: {
    timestamp: string;
    totalTests: number;
    passedTests: number;
    failedTests: number;
    passRate: number;
    avgConsistency: number;
    inconsistentTests: number;
    categoryStats: Record<string, { total: number; passed: number }>;
  };
  results: TestResult[];
}

class MathEvaluationRunner extends BaseRunner {
  constructor() {
    super("Math Runner");
  }
}

const runner = new MathEvaluationRunner();

export async function runMathEvaluation(
  testCases: TestCase[],
  runsPerTest: number = 3
): Promise<EvaluationResult> {
  // Create a single Helicone session for the entire evaluation
  const evaluationId = uuidv4();
  const sessionId = `math-evaluation-${evaluationId}`;

  console.log(
    `Running ${testCases.length} math tests with ${runsPerTest} runs each...`
  );
  console.log(`Helicone Session ID: ${sessionId}`);

  try {
    // Run all tests in parallel
    const testPromises = testCases.map(async (testCase) => {
      console.log(`Testing: ${testCase.name}`);

      // Run all runs for this test in parallel
      const runPromises = Array.from({ length: runsPerTest }, async (_, i) => {
        const start = Date.now();

        try {
          // Create a context with the session
          const contextWithSession = {
            logger: logger,
            userId: "test-evaluation",
            sessionId, // This ensures the tool uses the same session
          };

          const output = await checkMathWithMathJsTool.run(
            testCase.input,
            contextWithSession
          );
          const duration = Date.now() - start;

          // Check expectations
          const { passed, reasons } = checkMathExpectations(
            output,
            testCase.expectations
          );

          return {
            passed,
            status: output.status,
            errorType: output.errorDetails?.errorType,
            explanation: output.explanation,
            output,
            duration,
            failureReasons: reasons,
          };
        } catch (error: any) {
          return {
            passed: false,
            status: 'cannot_verify' as const,
            explanation: error.message,
            output: null,
            duration: Date.now() - start,
            failureReasons: [error.message],
          };
        }
      });

      const runs = await Promise.all(runPromises);

      // Calculate consistency
      const statuses = runs.map((r) => r.status);
      const consistencyScore = statuses.every((s) => s === statuses[0])
        ? 100
        : calculateConsistencyScore(runs);

      return {
        testCase,
        runs,
        overallPassed: runs.every((r) => r.passed),
        consistencyScore,
      };
    });

    const results = await Promise.all(testPromises);

    // Calculate metadata
    const passedTests = results.filter((r) => r.overallPassed).length;
    const categoryStats = calculateCategoryStats(results);

    return {
      metadata: {
        timestamp: new Date().toISOString(),
        totalTests: results.length,
        passedTests,
        failedTests: results.length - passedTests,
        passRate: Math.round((passedTests / results.length) * 100),
        avgConsistency: Math.round(
          results.reduce((sum, r) => sum + r.consistencyScore, 0) /
            results.length
        ),
        inconsistentTests: results.filter((r) => r.consistencyScore < 100)
          .length,
        categoryStats,
      },
      results,
    };
  } catch (error) {
    console.error("Error running math evaluation:", error);
    throw error;
  }
}

function checkMathExpectations(
  output: any,
  expectations: TestCase["expectations"]
) {
  const reasons: string[] = [];

  // Check status
  if (output.status !== expectations.status) {
    reasons.push(
      `Expected status '${expectations.status}' but got '${output.status}'`
    );
  }

  // Check error type if status is verified_false
  if (
    expectations.errorType &&
    output.status === 'verified_false' &&
    output.errorDetails?.errorType !== expectations.errorType
  ) {
    reasons.push(
      `Expected error type '${expectations.errorType}' but got '${output.errorDetails?.errorType}'`
    );
  }

  // Check confidence if specified
  if (expectations.minConfidence && output.confidence < expectations.minConfidence) {
    reasons.push(
      `Expected confidence >= ${expectations.minConfidence} but got ${output.confidence}`
    );
  }
  if (expectations.maxConfidence && output.confidence > expectations.maxConfidence) {
    reasons.push(
      `Expected confidence <= ${expectations.maxConfidence} but got ${output.confidence}`
    );
  }

  // Check if explanation contains required text
  if (expectations.mustContainInExplanation) {
    for (const text of expectations.mustContainInExplanation) {
      if (!output.explanation?.toLowerCase().includes(text.toLowerCase())) {
        reasons.push(
          `Expected explanation to contain '${text}'`
        );
      }
    }
  }

  return {
    passed: reasons.length === 0,
    reasons,
  };
}

function calculateConsistencyScore(runs: RunResult[]): number {
  // Simple consistency: what percentage of runs had the same status
  const statuses = runs.map((r) => r.status);
  const mode = getMostFrequent(statuses);
  const consistent = statuses.filter((s) => s === mode).length;
  return Math.round((consistent / runs.length) * 100);
}

function getMostFrequent<T>(arr: T[]): T {
  const counts = new Map<T, number>();
  for (const item of arr) {
    counts.set(item, (counts.get(item) || 0) + 1);
  }
  let maxCount = 0;
  let mode = arr[0];
  for (const [item, count] of counts) {
    if (count > maxCount) {
      maxCount = count;
      mode = item;
    }
  }
  return mode;
}

function calculateCategoryStats(results: TestResult[]) {
  const stats: Record<string, { total: number; passed: number }> = {};

  for (const result of results) {
    const category = result.testCase.category;
    if (!stats[category]) {
      stats[category] = { total: 0, passed: 0 };
    }
    stats[category].total++;
    if (result.overallPassed) {
      stats[category].passed++;
    }
  }

  return stats;
}