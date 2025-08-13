// Load environment variables
import * as dotenv from "dotenv";
import * as path from "path";
import { v4 as uuidv4 } from "uuid";

import { logger } from "../../../internal-packages/ai/src/shared/logger";
import { checkSpellingGrammarTool } from "../../../internal-packages/ai/src/tools/check-spelling-grammar";
import type { TestCase } from "../data/test-cases";

// Try multiple paths to find .env
const envPaths = [
  path.join(process.cwd(), ".env.local"),
  path.join(process.cwd(), "..", ".env.local"),
  path.join(__dirname, "..", "..", ".env.local"),
  path.join(__dirname, "..", "..", "..", ".env.local"),
  path.join(process.cwd(), ".env"),
  path.join(process.cwd(), "..", ".env"),
  path.join(__dirname, "..", "..", ".env"),
  path.join(__dirname, "..", "..", "..", ".env"),
];

let envLoaded = false;
for (const envPath of envPaths) {
  const result = dotenv.config({ path: envPath });
  if (!result.error) {
    console.log(`[Runner] Loaded .env from: ${envPath}`);
    envLoaded = true;
    break;
  }
}

if (!envLoaded) {
  console.warn(
    "[Runner] Warning: Could not load .env file from any of the expected paths"
  );
}

// Check if API key is loaded
if (!process.env.ANTHROPIC_API_KEY) {
  console.warn("[Runner] Warning: ANTHROPIC_API_KEY not found in environment");
} else {
  console.log("[Runner] ANTHROPIC_API_KEY loaded successfully");
}

export interface RunResult {
  passed: boolean;
  errors: any[];
  output: any;
  duration: number;
  failureReasons: string[];
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

export async function runEvaluation(
  testCases: TestCase[],
  runsPerTest: number = 3
): Promise<EvaluationResult> {
  // Create a single Helicone session for the entire evaluation
  const evaluationId = uuidv4();
  const sessionId = `evaluation-${evaluationId}`;

  console.log(
    `Running ${testCases.length} tests with ${runsPerTest} runs each...`
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

          const output = await checkSpellingGrammarTool.run(
            testCase.input,
            contextWithSession
          );
          const duration = Date.now() - start;

          // Check expectations - use testCase.expectations or create default
          const expectations = testCase.expectations || {
            shouldFindErrors: testCase.shouldFindErrors ?? true,
            minErrors: testCase.minErrors,
            maxErrors: testCase.maxErrors,
            mustFind: testCase.mustFind
          };
          const { passed, reasons } = checkExpectations(
            output,
            expectations
          );

          return {
            passed,
            errors: output.errors,
            output,
            duration,
            failureReasons: reasons,
          };
        } catch (error: any) {
          return {
            passed: false,
            errors: [],
            output: null,
            duration: Date.now() - start,
            failureReasons: [error.message],
          };
        }
      });

      const runs = await Promise.all(runPromises);

      // Calculate consistency
      const errorCounts = runs.map((r) => r.errors.length);
      const consistencyScore = errorCounts.every((c) => c === errorCounts[0])
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
    console.error("Error running evaluation:", error);
    throw error;
  }
}

function checkExpectations(
  output: any,
  expectations: TestCase["expectations"]
) {
  const reasons: string[] = [];

  // Check error count
  if (expectations.shouldFindErrors && output.errors.length === 0) {
    reasons.push("Expected errors but found none");
  }
  if (!expectations.shouldFindErrors && output.errors.length > 0) {
    reasons.push(`Expected no errors but found ${output.errors.length}`);
  }

  // Check min/max errors
  if (expectations.minErrors && output.errors.length < expectations.minErrors) {
    reasons.push(
      `Expected at least ${expectations.minErrors} errors but found ${output.errors.length}`
    );
  }
  if (expectations.maxErrors && output.errors.length > expectations.maxErrors) {
    reasons.push(
      `Expected at most ${expectations.maxErrors} errors but found ${output.errors.length}`
    );
  }

  // Check must find
  if (expectations.mustFind) {
    for (const must of expectations.mustFind) {
      const found = output.errors.find((e: any) => {
        const textMatch =
          !must.text || e.text?.toLowerCase() === must.text.toLowerCase();
        const correctionMatch =
          !must.correction ||
          e.correction?.toLowerCase() === must.correction.toLowerCase();
        const typeMatch = !must.type || e.type === must.type;
        const minImpMatch =
          !must.minImportance || e.importance >= must.minImportance;
        const maxImpMatch =
          !must.maxImportance || e.importance <= must.maxImportance;

        return (
          textMatch &&
          correctionMatch &&
          typeMatch &&
          minImpMatch &&
          maxImpMatch
        );
      });

      if (!found) {
        reasons.push(
          `Expected to find error: ${must.text}${must.correction ? " → " + must.correction : ""}`
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
  // Simple consistency: what percentage of runs had the same error count
  const errorCounts = runs.map((r) => r.errors.length);
  const mode = getMostFrequent(errorCounts);
  const consistent = errorCounts.filter((c) => c === mode).length;
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
