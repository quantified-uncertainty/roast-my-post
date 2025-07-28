import { logger } from "@/lib/logger";
import {
  beforeEach,
  describe,
  expect,
  it,
} from "@jest/globals";

import { checkMathWithMathJsTool } from "./index";
import type { CheckMathAgenticInput } from "./types";
import type { CheckMathAgenticOutput } from "./types";

// Skip these tests in CI or when no API key is available
const describeIfApiKey =
  process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY.trim() !== ""
    ? describe
    : describe.skip;

// Extend timeout for API calls
const API_TIMEOUT = 30000;

// Parallel test execution helper
interface TestCase {
  name: string;
  input: CheckMathAgenticInput;
  expectations: (result: CheckMathAgenticOutput) => void;
}

interface TestBatchResult {
  passed: number;
  failed: number;
  errors: Array<{ testName: string; error: string }>;
}

async function runTestBatch(testCases: TestCase[], mockContext: any): Promise<TestBatchResult> {
  const results = await Promise.allSettled(
    testCases.map(async (testCase) => {
      try {
        const result = await checkMathWithMathJsTool.execute(testCase.input, mockContext);
        testCase.expectations(result);
        return { success: true, testName: testCase.name };
      } catch (error) {
        return {
          success: false,
          testName: testCase.name,
          error: error instanceof Error ? error.message : String(error)
        };
      }
    })
  );

  const batchResult: TestBatchResult = {
    passed: 0,
    failed: 0,
    errors: []
  };

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      if (result.value.success) {
        batchResult.passed++;
      } else {
        batchResult.failed++;
        batchResult.errors.push({
          testName: result.value.testName,
          error: result.value.error
        });
      }
    } else {
      batchResult.failed++;
      batchResult.errors.push({
        testName: testCases[index].name,
        error: `Promise rejected: ${result.reason}`
      });
    }
  });

  return batchResult;
}

describeIfApiKey("CheckMathWithMathJsTool Integration", () => {
  const mockContext = {
    logger,
    userId: "test-user",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Basic Arithmetic Verification", () => {
    it(
      "should run basic arithmetic tests in parallel",
      async () => {
        const testCases: TestCase[] = [
          {
            name: "correct addition",
            input: { statement: "2 + 2 = 4" },
            expectations: (result) => {
              expect(result.status).toBe("verified_true");
              expect(result.explanation).toBeTruthy();
              expect(result.verificationDetails).toBeDefined();
              expect(result.llmInteraction).toBeDefined();
            }
          },
          {
            name: "incorrect addition",
            input: { statement: "2 + 2 = 5" },
            expectations: (result) => {
              expect(result.status).toBe("verified_false");
              expect(result.explanation).toContain("4");
              expect(result.errorDetails).toBeDefined();
              expect(result.errorDetails?.errorType).toBe("calculation");
              expect(["critical", "major"]).toContain(result.errorDetails?.severity);
              expect(result.errorDetails?.conciseCorrection).toBeTruthy();
            }
          },
          {
            name: "correct multiplication",
            input: { statement: "5 × 7 = 35" },
            expectations: (result) => {
              expect(result.status).toBe("verified_true");
              expect(result.explanation).toBeTruthy();
            }
          },
          {
            name: "incorrect multiplication",
            input: { statement: "5 × 7 = 40" },
            expectations: (result) => {
              expect(result.status).toBe("verified_false");
              expect(result.explanation).toContain("35");
              expect(result.errorDetails?.errorType).toBe("calculation");
              expect(result.errorDetails?.conciseCorrection).toContain("35");
            }
          }
        ];

        const batchResult = await runTestBatch(testCases, mockContext);
        
        // Report any failures
        if (batchResult.failed > 0) {
          const errorMessages = batchResult.errors.map(
            err => `${err.testName}: ${err.error}`
          ).join('\n');
          throw new Error(`${batchResult.failed} test(s) failed:\n${errorMessages}`);
        }
        
        expect(batchResult.passed).toBe(testCases.length);
      },
      API_TIMEOUT * 2 // Double timeout for parallel execution
    );
  });

  describe("Percentage and Unit Calculations", () => {
    it(
      "should run percentage and unit tests in parallel (batch 1)",
      async () => {
        const testCases: TestCase[] = [
          {
            name: "correct percentage calculation",
            input: { statement: "15% of 200 equals 30" },
            expectations: (result) => {
              expect(result.status).toBe("verified_true");
              expect(result.explanation).toBeTruthy();
            }
          },
          {
            name: "incorrect percentage calculation",
            input: { statement: "15% of 200 equals 35" },
            expectations: (result) => {
              expect(result.status).toBe("verified_false");
              expect(result.explanation).toContain("30");
              expect(result.errorDetails?.errorType).toBe("calculation");
              expect(result.errorDetails?.conciseCorrection).toContain("30");
            }
          },
          {
            name: "correct unit conversion",
            input: { statement: "1 kilometer equals 1000 meters" },
            expectations: (result) => {
              expect(result.status).toBe("verified_true");
              expect(result.explanation).toBeTruthy();
            }
          },
          {
            name: "incorrect unit conversion",
            input: { statement: "1 mile equals 1000 meters" },
            expectations: (result) => {
              expect(result.status).toBe("verified_false");
              expect(result.explanation).toMatch(/1609|1,609/);
              expect(["unit", "calculation"]).toContain(result.errorDetails?.errorType);
              expect(["critical", "major"]).toContain(result.errorDetails?.severity);
            }
          },
          {
            name: "unit mismatch error",
            input: { statement: "5 km + 3000 m = $8" },
            expectations: (result) => {
              expect(result.status).toBe("verified_false");
              expect(result.errorDetails?.errorType).toBe("unit");
              expect(["critical", "major"]).toContain(result.errorDetails?.severity);
              expect(result.explanation.toLowerCase()).toMatch(/unit|distance.*monetary|cannot.*equal/);
              if (result.errorDetails?.conciseCorrection) {
                expect(result.errorDetails.conciseCorrection).toMatch(/8\s*km|\$8.*8\s*km/);
              }
              if (result.verificationDetails) {
                expect(result.verificationDetails.computedValue).toBeTruthy();
              }
            }
          }
        ];

        const batchResult = await runTestBatch(testCases, mockContext);
        
        if (batchResult.failed > 0) {
          const errorMessages = batchResult.errors.map(
            err => `${err.testName}: ${err.error}`
          ).join('\n');
          throw new Error(`${batchResult.failed} test(s) failed:\n${errorMessages}`);
        }
        
        expect(batchResult.passed).toBe(testCases.length);
      },
      API_TIMEOUT * 2
    );
  });

  describe("Mathematical Approximations", () => {
    it(
      "should run approximation tests in parallel",
      async () => {
        const testCases: TestCase[] = [
          {
            name: "reasonable π approximation",
            input: { statement: "π ≈ 3.14" },
            expectations: (result) => {
              expect(result.status).toBe("verified_true");
              expect(result.explanation).toMatch(/approximation|reasonable|conventional/i);
            }
          },
          {
            name: "poor π approximation",
            input: { statement: "π ≈ 3.0" },
            expectations: (result) => {
              expect(result.status).toBe("verified_false");
              expect(result.explanation).toContain("3.14");
              expect(["calculation", "notation"]).toContain(result.errorDetails?.errorType);
              expect(["minor", "major"]).toContain(result.errorDetails?.severity);
            }
          },
          {
            name: "engineering approximation with context",
            input: {
              statement: "For engineering calculations, we use g = 10 m/s²",
              context: "Engineering approximation context where precise values are not required"
            },
            expectations: (result) => {
              expect(result.status).toBe("verified_true");
              expect(result.explanation).toMatch(/engineering|approximation|acceptable/i);
            }
          }
        ];

        const batchResult = await runTestBatch(testCases, mockContext);
        
        if (batchResult.failed > 0) {
          const errorMessages = batchResult.errors.map(
            err => `${err.testName}: ${err.error}`
          ).join('\n');
          throw new Error(`${batchResult.failed} test(s) failed:\n${errorMessages}`);
        }
        
        expect(batchResult.passed).toBe(testCases.length);
      },
      API_TIMEOUT * 2
    );
  });

  describe("Symbolic Math Limitations", () => {
    it(
      "should handle symbolic math limitations in parallel",
      async () => {
        const testCases: TestCase[] = [
          {
            name: "symbolic derivative statement",
            input: { statement: "The derivative of x³ is 3x²" },
            expectations: (result) => {
              expect(result.status).toBe("cannot_verify");
              expect(result.explanation).toMatch(/symbolic|numerical|cannot/i);
              expect(result.errorDetails).toBeUndefined();
            }
          },
          {
            name: "symbolic integral statement",
            input: { statement: "The integral of 2x is x² + C" },
            expectations: (result) => {
              expect(result.status).toBe("cannot_verify");
              expect(result.explanation).toMatch(/symbolic|numerical|cannot/i);
              expect(result.errorDetails).toBeUndefined();
            }
          },
          {
            name: "algebraic identity",
            input: { statement: "(a + b)² = a² + 2ab + b²" },
            expectations: (result) => {
              expect(result.status).toBe("cannot_verify");
              expect(result.explanation).toMatch(/symbolic|algebraic|cannot/i);
            }
          }
        ];

        const batchResult = await runTestBatch(testCases, mockContext);
        
        if (batchResult.failed > 0) {
          const errorMessages = batchResult.errors.map(
            err => `${err.testName}: ${err.error}`
          ).join('\n');
          throw new Error(`${batchResult.failed} test(s) failed:\n${errorMessages}`);
        }
        
        expect(batchResult.passed).toBe(testCases.length);
      },
      API_TIMEOUT * 2
    );
  });

  describe("Advanced Mathematical Functions", () => {
    it(
      "should run advanced function tests in parallel (batch 1)",
      async () => {
        const testCases: TestCase[] = [
          {
            name: "correct square root",
            input: { statement: "sqrt(16) = 4" },
            expectations: (result) => {
              expect(result.status).toBe("verified_true");
              expect(result.explanation).toBeTruthy();
              expect(result.verificationDetails?.mathJsExpression).toBeTruthy();
            }
          },
          {
            name: "incorrect square root",
            input: { statement: "sqrt(16) = 5" },
            expectations: (result) => {
              expect(result.status).toBe("verified_false");
              expect(result.explanation).toContain("4");
              expect(result.errorDetails?.errorType).toBe("calculation");
              expect(result.errorDetails?.conciseCorrection).toContain("4");
            }
          },
          {
            name: "correct factorial",
            input: { statement: "5! = 120" },
            expectations: (result) => {
              expect(result.status).toBe("verified_true");
              expect(result.explanation).toBeTruthy();
            }
          },
          {
            name: "incorrect factorial",
            input: { statement: "5! = 100" },
            expectations: (result) => {
              expect(result.status).toBe("verified_false");
              expect(result.explanation).toContain("120");
              expect(result.errorDetails?.errorType).toBe("calculation");
              expect(result.errorDetails?.conciseCorrection).toContain("120");
            }
          }
        ];

        const batchResult = await runTestBatch(testCases, mockContext);
        
        if (batchResult.failed > 0) {
          const errorMessages = batchResult.errors.map(
            err => `${err.testName}: ${err.error}`
          ).join('\n');
          throw new Error(`${batchResult.failed} test(s) failed:\n${errorMessages}`);
        }
        
        expect(batchResult.passed).toBe(testCases.length);
      },
      API_TIMEOUT * 2
    );

    it(
      "should run combination tests in parallel (batch 2)",
      async () => {
        const testCases: TestCase[] = [
          {
            name: "correct combination calculation",
            input: { statement: "10 choose 3 equals 120" },
            expectations: (result) => {
              expect(result.status).toBe("verified_true");
              expect(result.explanation).toBeTruthy();
            }
          },
          {
            name: "incorrect combination calculation",
            input: { statement: "10 choose 3 equals 30" },
            expectations: (result) => {
              expect(result.status).toBe("verified_false");
              expect(result.explanation).toContain("120");
              expect(result.errorDetails?.errorType).toBe("calculation");
            }
          }
        ];

        const batchResult = await runTestBatch(testCases, mockContext);
        
        if (batchResult.failed > 0) {
          const errorMessages = batchResult.errors.map(
            err => `${err.testName}: ${err.error}`
          ).join('\n');
          throw new Error(`${batchResult.failed} test(s) failed:\n${errorMessages}`);
        }
        
        expect(batchResult.passed).toBe(testCases.length);
      },
      API_TIMEOUT * 2
    );
  });

  describe("Error Categorization and Details", () => {
    it(
      "should run error categorization tests in parallel",
      async () => {
        const testCases: TestCase[] = [
          {
            name: "logic error categorization",
            input: { statement: "If we flip a coin 10 times, we will definitely get exactly 5 heads" },
            expectations: (result) => {
              expect(result.status).toBe("verified_false");
              expect(result.errorDetails?.errorType).toBe("logic");
              expect(result.explanation).toMatch(/probability|definitely|cannot guarantee|random/i);
            }
          },
          {
            name: "conceptual error categorization",
            input: { statement: "For any triangle, a² + b² = c²" },
            expectations: (result) => {
              expect(["verified_false", "cannot_verify"]).toContain(result.status);
              if (result.status === "verified_false") {
                expect(result.errorDetails?.errorType).toBe("conceptual");
                expect(result.explanation).toMatch(/right triangle|pythagorean/i);
                expect(["major", "critical"]).toContain(result.errorDetails?.severity);
              } else {
                expect(result.explanation).toMatch(/symbolic|algebraic|general.*statement/i);
              }
            }
          },
          {
            name: "detailed tool call information",
            input: { statement: "2^10 = 1024" },
            expectations: (result) => {
              expect(result.verificationDetails).toBeDefined();
              expect(result.verificationDetails?.mathJsExpression).toBeTruthy();
              expect(result.verificationDetails?.computedValue).toBeTruthy();
            }
          }
        ];

        const batchResult = await runTestBatch(testCases, mockContext);
        
        if (batchResult.failed > 0) {
          const errorMessages = batchResult.errors.map(
            err => `${err.testName}: ${err.error}`
          ).join('\n');
          throw new Error(`${batchResult.failed} test(s) failed:\n${errorMessages}`);
        }
        
        expect(batchResult.passed).toBe(testCases.length);
      },
      API_TIMEOUT * 2
    );
  });

  describe("Complex Statements and Edge Cases", () => {
    it(
      "should handle complex statements and edge cases in parallel",
      async () => {
        const testCases: TestCase[] = [
          {
            name: "multiple calculations statement",
            input: { statement: "Given that 2 + 2 = 4 and 3 × 5 = 15, therefore 4 + 15 = 19" },
            expectations: (result) => {
              expect(result.status).toBe("verified_true");
              expect(result.explanation).toBeTruthy();
            }
          },
          {
            name: "compound statement with error",
            input: { statement: "Since 2 + 2 = 4 and 3 × 5 = 16, therefore 4 + 16 = 20" },
            expectations: (result) => {
              expect(result.status).toBe("verified_false");
              expect(result.explanation).toContain("15");
              expect(result.errorDetails?.errorType).toBe("calculation");
            }
          },
          {
            name: "notation ambiguity",
            input: { statement: "6/2(1+2) = 9" },
            expectations: (result) => {
              expect(["verified_true", "verified_false"]).toContain(result.status);
              if (result.status === "verified_false") {
                expect(["notation", "calculation"]).toContain(result.errorDetails?.errorType);
              }
            }
          },
          {
            name: "incomplete expression",
            input: { statement: "The result is 0.736% of..." },
            expectations: (result) => {
              expect(result.status).toBe("cannot_verify");
              expect(result.explanation).toMatch(/incomplete|cannot determine|insufficient/i);
            }
          }
        ];

        const batchResult = await runTestBatch(testCases, mockContext);
        
        if (batchResult.failed > 0) {
          const errorMessages = batchResult.errors.map(
            err => `${err.testName}: ${err.error}`
          ).join('\n');
          throw new Error(`${batchResult.failed} test(s) failed:\n${errorMessages}`);
        }
        
        expect(batchResult.passed).toBe(testCases.length);
      },
      API_TIMEOUT * 2
    );
  });
});
