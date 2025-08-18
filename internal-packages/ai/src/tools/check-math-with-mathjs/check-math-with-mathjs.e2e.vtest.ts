import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';
import { logger } from "../../shared/logger";
import {
  beforeEach,
  describe,
  expect,
  it,
} from "@jest/globals";

import { checkMathWithMathJsTool } from "./index";

// Skip these tests in CI or when no API key is available
const describeIfApiKey =
  process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY.trim() !== ""
    ? describe
    : describe.skip;

// Extend timeout for API calls
const API_TIMEOUT = 30000;

describeIfApiKey("CheckMathWithMathJsTool E2E", () => {
  let mockContext: any;

  beforeEach(() => {
    mockContext = {
      logger,
      userId: "test-user",
    };
  });

  describe("Core functionality", () => {
    it("should handle direct evaluation vs LLM paths", async () => {
      // Direct evaluation should work for simple expressions
      const directResult = await checkMathWithMathJsTool.execute(
        { statement: "2 + 2 = 4" },
        mockContext
      );
      
      expect(directResult.status).toBe("verified_true");
      expect(directResult.llmInteraction?.model).toBe("direct-evaluation");

      // Complex natural language should use LLM
      const llmResult = await checkMathWithMathJsTool.execute(
        { statement: "If I have 5 apples and give away 2, I have 3 left" },
        mockContext
      );
      
      expect(llmResult.status).toBe("verified_true");
      expect(llmResult.llmInteraction?.model).not.toBe("direct-evaluation");
    }, API_TIMEOUT);

    it("should handle unit conversions correctly", async () => {
      const result = await checkMathWithMathJsTool.execute(
        { statement: "5 km + 3000 m = 8 km" },
        mockContext
      );

      expect(result.status).toBe("verified_true");
      expect(result.explanation).toBeTruthy();
    }, API_TIMEOUT);

    it("should handle symbolic math fallback", async () => {
      const result = await checkMathWithMathJsTool.execute(
        { statement: "The derivative of x² is 2x" },
        mockContext
      );

      expect(result.status).toBe("cannot_verify");
      expect(result.explanation).toContain("symbolic");
    }, API_TIMEOUT);
  });

  describe("Approximation handling", () => {
    it("should accept reasonable approximations", async () => {
      const piResult = await checkMathWithMathJsTool.execute(
        { statement: "π = 3.14" },
        mockContext
      );

      expect(piResult.status).toBe("verified_true");
      expect(piResult.llmInteraction?.model).toBe("direct-evaluation");
    }, API_TIMEOUT);

    it("should reject poor approximations", async () => {
      const result = await checkMathWithMathJsTool.execute(
        { statement: "π = 3.0" },
        mockContext
      );

      expect(result.status).toBe("verified_false");
      expect(result.explanation).toContain("3.1");
    }, API_TIMEOUT);
  });

  describe("Error handling", () => {
    it("should handle malformed expressions gracefully", async () => {
      const result = await checkMathWithMathJsTool.execute(
        { statement: "2 ++ 2 === 4" },
        mockContext
      );

      // Should either parse correctly or handle error gracefully
      expect(["verified_true", "verified_false", "cannot_verify"]).toContain(result.status);
      expect(result.explanation).toBeTruthy();
    }, API_TIMEOUT);
  });
});