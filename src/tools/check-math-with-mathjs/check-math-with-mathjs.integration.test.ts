import { logger } from "@/lib/logger";
import {
  beforeEach,
  describe,
  expect,
  it,
} from "@jest/globals";

import { checkMathWithMathJsTool } from "./index";
import type { CheckMathAgenticInput } from "./types";

// Skip these tests in CI or when no API key is available
const describeIfApiKey =
  process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY.trim() !== ""
    ? describe
    : describe.skip;

// Extend timeout for API calls
const API_TIMEOUT = 30000;

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
      "should verify correct addition",
      async () => {
        const input: CheckMathAgenticInput = {
          statement: "2 + 2 = 4",
        };

        const result = await checkMathWithMathJsTool.execute(input, mockContext);

        expect(result.status).toBe("verified_true");
        expect(result.explanation).toBeTruthy();
        expect(result.verificationDetails).toBeDefined();
        expect(result.llmInteraction).toBeDefined();
      },
      API_TIMEOUT
    );

    it(
      "should detect incorrect addition",
      async () => {
        const input: CheckMathAgenticInput = {
          statement: "2 + 2 = 5",
        };

        const result = await checkMathWithMathJsTool.execute(input, mockContext);

        expect(result.status).toBe("verified_false");
        expect(result.explanation).toContain("4");
        expect(result.errorDetails).toBeDefined();
        expect(result.errorDetails?.errorType).toBe("calculation");
        expect(["critical", "major"]).toContain(result.errorDetails?.severity);
        expect(result.errorDetails?.conciseCorrection).toBeTruthy();
      },
      API_TIMEOUT
    );

    it(
      "should verify correct multiplication",
      async () => {
        const input: CheckMathAgenticInput = {
          statement: "5 × 7 = 35",
        };

        const result = await checkMathWithMathJsTool.execute(input, mockContext);

        expect(result.status).toBe("verified_true");
        expect(result.explanation).toBeTruthy();
      },
      API_TIMEOUT
    );

    it(
      "should detect incorrect multiplication",
      async () => {
        const input: CheckMathAgenticInput = {
          statement: "5 × 7 = 40",
        };

        const result = await checkMathWithMathJsTool.execute(input, mockContext);

        expect(result.status).toBe("verified_false");
        expect(result.explanation).toContain("35");
        expect(result.errorDetails?.errorType).toBe("calculation");
        expect(result.errorDetails?.conciseCorrection).toContain("35");
      },
      API_TIMEOUT
    );
  });

  describe("Percentage and Unit Calculations", () => {
    it(
      "should verify correct percentage calculation",
      async () => {
        const input: CheckMathAgenticInput = {
          statement: "15% of 200 equals 30",
        };

        const result = await checkMathWithMathJsTool.execute(input, mockContext);

        expect(result.status).toBe("verified_true");
        expect(result.explanation).toBeTruthy();
      },
      API_TIMEOUT
    );

    it(
      "should detect incorrect percentage calculation",
      async () => {
        const input: CheckMathAgenticInput = {
          statement: "15% of 200 equals 35",
        };

        const result = await checkMathWithMathJsTool.execute(input, mockContext);

        expect(result.status).toBe("verified_false");
        expect(result.explanation).toContain("30");
        expect(result.errorDetails?.errorType).toBe("calculation");
        expect(result.errorDetails?.conciseCorrection).toContain("30");
      },
      API_TIMEOUT
    );

    it(
      "should verify correct unit conversion",
      async () => {
        const input: CheckMathAgenticInput = {
          statement: "1 kilometer equals 1000 meters",
        };

        const result = await checkMathWithMathJsTool.execute(input, mockContext);

        expect(result.status).toBe("verified_true");
        expect(result.explanation).toBeTruthy();
      },
      API_TIMEOUT
    );

    it(
      "should detect incorrect unit conversion",
      async () => {
        const input: CheckMathAgenticInput = {
          statement: "1 mile equals 1000 meters",
        };

        const result = await checkMathWithMathJsTool.execute(input, mockContext);

        expect(result.status).toBe("verified_false");
        expect(result.explanation).toMatch(/1609|1,609/);
        expect(["unit", "calculation"]).toContain(
          result.errorDetails?.errorType
        );
        expect(["critical", "major"]).toContain(result.errorDetails?.severity);
      },
      API_TIMEOUT
    );

    it(
      "should provide correct answer for unit mismatch errors",
      async () => {
        const input: CheckMathAgenticInput = {
          statement: "5 km + 3000 m = $8",
        };

        const result = await checkMathWithMathJsTool.execute(input, mockContext);

        expect(result.status).toBe("verified_false");
        expect(result.errorDetails?.errorType).toBe("unit");
        expect(["critical", "major"]).toContain(result.errorDetails?.severity);

        // Should indicate unit error in explanation
        expect(result.explanation.toLowerCase()).toMatch(
          /unit|distance.*monetary|cannot.*equal/
        );

        // If concise correction is provided, it should show the correct answer
        if (result.errorDetails?.conciseCorrection) {
          expect(result.errorDetails.conciseCorrection).toMatch(
            /8\s*km|\$8.*8\s*km/
          );
        }

        // Should have computed the correct value if verification details exist
        if (result.verificationDetails) {
          expect(result.verificationDetails.computedValue).toBeTruthy();
        }
      },
      API_TIMEOUT
    );
  });

  describe("Mathematical Approximations", () => {
    it(
      "should accept reasonable π approximation",
      async () => {
        const input: CheckMathAgenticInput = {
          statement: "π ≈ 3.14",
        };

        const result = await checkMathWithMathJsTool.execute(input, mockContext);

        expect(result.status).toBe("verified_true");
        expect(result.explanation).toMatch(
          /approximation|reasonable|conventional/i
        );
      },
      API_TIMEOUT
    );

    it(
      "should detect poor π approximation",
      async () => {
        const input: CheckMathAgenticInput = {
          statement: "π ≈ 3.0",
        };

        const result = await checkMathWithMathJsTool.execute(input, mockContext);

        expect(result.status).toBe("verified_false");
        expect(result.explanation).toContain("3.14");
        expect(["calculation", "notation"]).toContain(
          result.errorDetails?.errorType
        );
        expect(["minor", "major"]).toContain(result.errorDetails?.severity);
      },
      API_TIMEOUT
    );

    it(
      "should accept engineering approximation with context",
      async () => {
        const input: CheckMathAgenticInput = {
          statement: "For engineering calculations, we use g = 10 m/s²",
          context:
            "Engineering approximation context where precise values are not required",
        };

        const result = await checkMathWithMathJsTool.execute(input, mockContext);

        expect(result.status).toBe("verified_true");
        expect(result.explanation).toMatch(
          /engineering|approximation|acceptable/i
        );
      },
      API_TIMEOUT
    );
  });

  describe("Symbolic Math Limitations", () => {
    it(
      "should not verify symbolic derivative statement",
      async () => {
        const input: CheckMathAgenticInput = {
          statement: "The derivative of x³ is 3x²",
        };

        const result = await checkMathWithMathJsTool.execute(input, mockContext);

        expect(result.status).toBe("cannot_verify");
        expect(result.explanation).toMatch(/symbolic|numerical|cannot/i);
        expect(result.errorDetails).toBeUndefined();
      },
      API_TIMEOUT
    );

    it(
      "should not verify symbolic integral statement",
      async () => {
        const input: CheckMathAgenticInput = {
          statement: "The integral of 2x is x² + C",
        };

        const result = await checkMathWithMathJsTool.execute(input, mockContext);

        expect(result.status).toBe("cannot_verify");
        expect(result.explanation).toMatch(/symbolic|numerical|cannot/i);
        expect(result.errorDetails).toBeUndefined();
      },
      API_TIMEOUT
    );

    it(
      "should not verify algebraic identity",
      async () => {
        const input: CheckMathAgenticInput = {
          statement: "(a + b)² = a² + 2ab + b²",
        };

        const result = await checkMathWithMathJsTool.execute(input, mockContext);

        expect(result.status).toBe("cannot_verify");
        expect(result.explanation).toMatch(/symbolic|algebraic|cannot/i);
      },
      API_TIMEOUT
    );
  });

  describe("Advanced Mathematical Functions", () => {
    it(
      "should verify correct square root",
      async () => {
        const input: CheckMathAgenticInput = {
          statement: "sqrt(16) = 4",
        };

        const result = await checkMathWithMathJsTool.execute(input, mockContext);

        expect(result.status).toBe("verified_true");
        expect(result.explanation).toBeTruthy();
        expect(result.verificationDetails?.mathJsExpression).toBeTruthy();
      },
      API_TIMEOUT
    );

    it(
      "should detect incorrect square root",
      async () => {
        const input: CheckMathAgenticInput = {
          statement: "sqrt(16) = 5",
        };

        const result = await checkMathWithMathJsTool.execute(input, mockContext);

        expect(result.status).toBe("verified_false");
        expect(result.explanation).toContain("4");
        expect(result.errorDetails?.errorType).toBe("calculation");
        expect(result.errorDetails?.conciseCorrection).toContain("4");
      },
      API_TIMEOUT
    );

    it(
      "should verify correct factorial",
      async () => {
        const input: CheckMathAgenticInput = {
          statement: "5! = 120",
        };

        const result = await checkMathWithMathJsTool.execute(input, mockContext);

        expect(result.status).toBe("verified_true");
        expect(result.explanation).toBeTruthy();
      },
      API_TIMEOUT
    );

    it(
      "should detect incorrect factorial",
      async () => {
        const input: CheckMathAgenticInput = {
          statement: "5! = 100",
        };

        const result = await checkMathWithMathJsTool.execute(input, mockContext);

        expect(result.status).toBe("verified_false");
        expect(result.explanation).toContain("120");
        expect(result.errorDetails?.errorType).toBe("calculation");
        expect(result.errorDetails?.conciseCorrection).toContain("120");
      },
      API_TIMEOUT
    );

    it(
      "should verify correct combination calculation",
      async () => {
        const input: CheckMathAgenticInput = {
          statement: "10 choose 3 equals 120",
        };

        const result = await checkMathWithMathJsTool.execute(input, mockContext);

        expect(result.status).toBe("verified_true");
        expect(result.explanation).toBeTruthy();
      },
      API_TIMEOUT
    );

    it(
      "should detect incorrect combination calculation",
      async () => {
        const input: CheckMathAgenticInput = {
          statement: "10 choose 3 equals 30",
        };

        const result = await checkMathWithMathJsTool.execute(input, mockContext);

        expect(result.status).toBe("verified_false");
        expect(result.explanation).toContain("120");
        expect(result.errorDetails?.errorType).toBe("calculation");
      },
      API_TIMEOUT
    );
  });

  describe("Error Categorization and Details", () => {
    it(
      "should categorize logic errors correctly",
      async () => {
        const input: CheckMathAgenticInput = {
          statement:
            "If we flip a coin 10 times, we will definitely get exactly 5 heads",
        };

        const result = await checkMathWithMathJsTool.execute(input, mockContext);

        expect(result.status).toBe("verified_false");
        expect(result.errorDetails?.errorType).toBe("logic");
        expect(result.explanation).toMatch(
          /probability|definitely|cannot guarantee|random/i
        );
      },
      API_TIMEOUT
    );

    it(
      "should categorize conceptual errors correctly",
      async () => {
        const input: CheckMathAgenticInput = {
          statement: "For any triangle, a² + b² = c²",
        };

        const result = await checkMathWithMathJsTool.execute(input, mockContext);

        // This is a theoretical statement that might be cannot_verify or verified_false
        expect(["verified_false", "cannot_verify"]).toContain(result.status);

        if (result.status === "verified_false") {
          expect(result.errorDetails?.errorType).toBe("conceptual");
          expect(result.explanation).toMatch(/right triangle|pythagorean/i);
          expect(["major", "critical"]).toContain(
            result.errorDetails?.severity
          );
        } else {
          // If cannot_verify, should mention why
          expect(result.explanation).toMatch(
            /symbolic|algebraic|general.*statement/i
          );
        }
      },
      API_TIMEOUT
    );

    it(
      "should provide detailed tool call information",
      async () => {
        const input: CheckMathAgenticInput = {
          statement: "2^10 = 1024",
        };

        const result = await checkMathWithMathJsTool.execute(input, mockContext);

        expect(result.verificationDetails).toBeDefined();
        expect(result.verificationDetails?.mathJsExpression).toBeTruthy();
        expect(result.verificationDetails?.computedValue).toBeTruthy();
      },
      API_TIMEOUT
    );
  });

  describe("Complex Statements and Edge Cases", () => {
    it(
      "should handle statements with multiple calculations",
      async () => {
        const input: CheckMathAgenticInput = {
          statement:
            "Given that 2 + 2 = 4 and 3 × 5 = 15, therefore 4 + 15 = 19",
        };

        const result = await checkMathWithMathJsTool.execute(input, mockContext);

        expect(result.status).toBe("verified_true");
        expect(result.explanation).toBeTruthy();
      },
      API_TIMEOUT
    );

    it(
      "should detect errors in compound statements",
      async () => {
        const input: CheckMathAgenticInput = {
          statement: "Since 2 + 2 = 4 and 3 × 5 = 16, therefore 4 + 16 = 20",
        };

        const result = await checkMathWithMathJsTool.execute(input, mockContext);

        expect(result.status).toBe("verified_false");
        expect(result.explanation).toContain("15");
        expect(result.errorDetails?.errorType).toBe("calculation");
      },
      API_TIMEOUT
    );

    it(
      "should handle notation ambiguity",
      async () => {
        const input: CheckMathAgenticInput = {
          statement: "6/2(1+2) = 9",
        };

        const result = await checkMathWithMathJsTool.execute(input, mockContext);

        // Should either verify as true (following order of operations) or flag as notation issue
        expect(["verified_true", "verified_false"]).toContain(result.status);
        if (result.status === "verified_false") {
          expect(["notation", "calculation"]);
        }
      },
      API_TIMEOUT
    );

    it(
      "should handle incomplete expressions gracefully",
      async () => {
        const input: CheckMathAgenticInput = {
          statement: "The result is 0.736% of...",
        };

        const result = await checkMathWithMathJsTool.execute(input, mockContext);

        expect(result.status).toBe("cannot_verify");
        expect(result.explanation).toMatch(
          /incomplete|cannot determine|insufficient/i
        );
      },
      API_TIMEOUT
    );
  });
});
