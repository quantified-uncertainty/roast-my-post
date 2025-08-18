import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';
import { z } from "zod";

import { setupClaudeToolMock } from "../../claude/mockHelpers";
import { createMockLLMInteraction } from "../../claude/testUtils";
import { callClaudeWithTool } from "../../claude/wrapper";

import { ToolContext } from "../base/Tool";
import { ExtractForecastingClaimsTool } from "./index";

// Mock Claude wrapper
vi.mock("../../claude/wrapper", () => ({
  callClaudeWithTool: vi.fn(),
}));


const mockCallClaudeWithTool = callClaudeWithTool as any
  typeof callClaudeWithTool
>;
const { mockToolResponse } = setupClaudeToolMock(mockCallClaudeWithTool);

describe("ExtractForecastingClaimsTool (updated for single-stage)", () => {
  const tool = new ExtractForecastingClaimsTool();
  const mockContext: ToolContext = {
    userId: "test-user",
    logger: {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    } as any,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("input validation", () => {
    it("should validate required fields", async () => {
      const invalidInput = {}; // Missing text

      await expect(tool.run(invalidInput, mockContext)).rejects.toThrow(
        z.ZodError
      );
    });

    it("should validate text length limits", async () => {
      const invalidInput = { text: "a".repeat(10001) }; // Too long

      await expect(tool.run(invalidInput, mockContext)).rejects.toThrow(
        z.ZodError
      );
    });

    it("should validate maxDetailedAnalysis range", async () => {
      const invalidInput = {
        text: "Some text with predictions",
        maxDetailedAnalysis: 11, // Too high
      };

      await expect(tool.run(invalidInput, mockContext)).rejects.toThrow(
        z.ZodError
      );
    });

    it("should accept valid input with defaults", async () => {
      const validInput = {
        text: "AI will surpass human intelligence by 2030.",
      };

      // Mock single-stage extraction and scoring response
      mockToolResponse(
        {
          forecasts: [
            {
              originalText: "AI will surpass human intelligence by 2030",
              thinking:
                "Clear technological prediction with specific timeframe",
              precisionScore: 80,
              verifiabilityScore: 70,
              importanceScore: 90,
              robustnessScore: 60,
              rewrittenPredictionText:
                "Will AI systems achieve human-level general intelligence by 2030?",
              resolutionDate: "2030",
              authorProbability: undefined,
            },
          ],
        },
        { tokens: { input: 150, output: 80 } }
      );

      const result = await tool.run(validInput, mockContext);

      expect(result.forecasts).toHaveLength(1);
      expect(result.forecasts[0].originalText).toBe(
        "AI will surpass human intelligence by 2030"
      );
      expect(result.forecasts[0].precisionScore).toBe(80);
      expect(result.forecasts[0].verifiabilityScore).toBe(70);
      expect(result.forecasts[0].importanceScore).toBe(90);
    });
  });

  describe("execute", () => {
    it("should extract and score forecasting claims successfully", async () => {
      const input = {
        text: "The stock market will crash in 2024. There's a 70% chance of recession. Climate change might accelerate.",
        agentInstructions: "Focus on economic predictions",
        maxDetailedAnalysis: 2,
      };

      // Mock single-stage response with scored forecasts
      const mockForecasts = [
        {
          originalText: "The stock market will crash in 2024",
          thinking:
            "Specific market prediction with timeline, highly relevant to economic focus",
          precisionScore: 85,
          verifiabilityScore: 90,
          importanceScore: 70,
          robustnessScore: 65,
          rewrittenPredictionText:
            "Will the S&P 500 decline by more than 20% in 2024?",
          resolutionDate: "2024",
          authorProbability: undefined,
        },
        {
          originalText: "There's a 70% chance of recession",
          thinking: "Quantified economic forecast with specific probability",
          precisionScore: 75,
          verifiabilityScore: 80,
          importanceScore: 85,
          robustnessScore: 70,
          rewrittenPredictionText:
            "Will the US enter a recession (two consecutive quarters of negative GDP growth)?",
          authorProbability: 70,
          resolutionDate: undefined,
        },
        {
          originalText: "Climate change might accelerate",
          thinking: "Vague prediction, not economic focus",
          precisionScore: 20,
          verifiabilityScore: 30,
          importanceScore: 40,
          robustnessScore: 35,
          rewrittenPredictionText:
            "Will global temperature rise accelerate beyond current projections?",
          resolutionDate: undefined,
          authorProbability: undefined,
        },
      ];

      mockToolResponse(
        { forecasts: mockForecasts },
        { tokens: { input: 300, output: 180 } }
      );

      const result = await tool.execute(input, mockContext);

      expect(result.forecasts).toHaveLength(3);

      // Check that forecasts are returned with their scores
      expect(result.forecasts[0].originalText).toBe(
        "The stock market will crash in 2024"
      );
      expect(result.forecasts[0].precisionScore).toBe(85);
      expect(result.forecasts[0].verifiabilityScore).toBe(90);
      expect(result.forecasts[0].importanceScore).toBe(70);

      expect(result.forecasts[1].originalText).toBe(
        "There's a 70% chance of recession"
      );
      expect(result.forecasts[1].precisionScore).toBe(75);
      expect(result.forecasts[1].verifiabilityScore).toBe(80);
      expect(result.forecasts[1].importanceScore).toBe(85);

      expect(result.forecasts[2].originalText).toBe(
        "Climate change might accelerate"
      );
      expect(result.forecasts[2].precisionScore).toBe(20);
      expect(result.forecasts[2].verifiabilityScore).toBe(30);
      expect(result.forecasts[2].importanceScore).toBe(40);
    });

    it("should handle text with no forecasts", async () => {
      const input = {
        text: "This is just descriptive text about the past with no predictions.",
      };

      // Mock empty extraction response
      mockToolResponse(
        { forecasts: [] },
        { tokens: { input: 100, output: 20 } }
      );

      const result = await tool.execute(input, mockContext);

      expect(result.forecasts).toHaveLength(0);
    });

    it("should handle forecasts with probability and timeframe", async () => {
      const input = {
        text: "There is a 60% chance that Bitcoin will reach $100k by end of 2024.",
      };

      // Mock extraction response with probability and timeframe
      mockToolResponse(
        {
          forecasts: [
            {
              originalText: "Bitcoin will reach $100k by end of 2024",
              thinking:
                "Specific cryptocurrency prediction with probability and timeframe",
              precisionScore: 70,
              verifiabilityScore: 80,
              importanceScore: 50,
              robustnessScore: 55,
              rewrittenPredictionText:
                "Will Bitcoin price reach $100,000 USD by December 31, 2024?",
              authorProbability: 60,
              resolutionDate: "end of 2024",
            },
          ],
        },
        { tokens: { input: 180, output: 100 } }
      );

      const result = await tool.execute(input, mockContext);

      expect(result.forecasts[0].authorProbability).toBe(60);
      expect(result.forecasts[0].resolutionDate).toBe("end of 2024");
      expect(result.forecasts[0].precisionScore).toBe(70);
      expect(result.forecasts[0].verifiabilityScore).toBe(80);
      expect(result.forecasts[0].importanceScore).toBe(50);
    });
  });

  describe("error handling", () => {
    it("should handle extraction errors", async () => {
      const input = { text: "Some text with predictions" };
      const error = new Error("Anthropic API error");

      mockCallClaudeWithTool.mockImplementationOnce(() => Promise.reject(error);

      await expect(tool.execute(input, mockContext)).rejects.toThrow(
        "Anthropic API error"
      );
    });

    it("should handle malformed tool responses", async () => {
      const input = { text: "Some text with predictions" };

      // Mock malformed response (no tool use)
      mockCallClaudeWithTool.mockImplementationOnce(() => Promise.resolve(({
        response: {} as any,
        interaction: createMockLLMInteraction(),
        toolResult: {}
      } as any);

      const result = await tool.execute(input, mockContext);

      expect(result.forecasts).toHaveLength(0);
    });
  });
});

describe("ExtractForecastingClaimsTool with wrapper mocks", () => {
  const tool = new ExtractForecastingClaimsTool();
  const mockContext: ToolContext = {
    userId: "test-user",
    logger: {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    } as any,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("execute with mocked wrapper", () => {
    it("should extract and score forecasting claims successfully", async () => {
      const input = {
        text: "AI will surpass human intelligence by 2050. There is a 70% chance of recession in 2025.",
        maxDetailedAnalysis: 2,
      };

      const mockInteraction = createMockLLMInteraction();

      // Mock single-stage extraction and scoring
      mockCallClaudeWithTool.mockImplementationOnce(
        async (options, interactions) => {
          if (interactions) {
            interactions.push(mockInteraction);
          }
          return {
            response: {} as any,
            interaction: mockInteraction,
            toolResult: {
              forecasts: [
                {
                  originalText: "AI will surpass human intelligence by 2050",
                  thinking:
                    "Significant technological prediction with clear timeframe",
                  precisionScore: 85,
                  verifiabilityScore: 75,
                  importanceScore: 90,
                  robustnessScore: 60,
                  rewrittenPredictionText:
                    "Will artificial general intelligence surpass human intelligence by 2050?",
                  resolutionDate: "2050",
                  authorProbability: undefined,
                },
                {
                  originalText: "There is a 70% chance of recession in 2025",
                  thinking:
                    "Quantified economic forecast with specific probability and near-term timeline",
                  precisionScore: 90,
                  verifiabilityScore: 95,
                  importanceScore: 85,
                  robustnessScore: 75,
                  rewrittenPredictionText:
                    "Will the US economy enter a recession in 2025?",
                  authorProbability: 70,
                  resolutionDate: "2025",
                },
              ],
            },
          };
        }
      );

      const result = await tool.execute(input, mockContext);

      expect(result.forecasts).toHaveLength(2);

      // Check forecast details
      expect(result.forecasts[0].originalText).toBe(
        "AI will surpass human intelligence by 2050"
      );
      expect(result.forecasts[0].precisionScore).toBe(85);
      expect(result.forecasts[0].verifiabilityScore).toBe(75);
      expect(result.forecasts[0].importanceScore).toBe(90);

      expect(result.forecasts[1].originalText).toBe(
        "There is a 70% chance of recession in 2025"
      );
      expect(result.forecasts[1].precisionScore).toBe(90);
      expect(result.forecasts[1].verifiabilityScore).toBe(95);
      expect(result.forecasts[1].importanceScore).toBe(85);
    });

    it("should handle text with no forecasts", async () => {
      const input = {
        text: "This is just descriptive text about the past with no predictions.",
      };

      const mockInteraction = createMockLLMInteraction();

      // Mock empty extraction response
      mockCallClaudeWithTool.mockImplementationOnce(
        async (options, interactions) => {
          if (interactions) {
            interactions.push(mockInteraction);
          }
          return {
            response: {} as any,
            interaction: mockInteraction,
            toolResult: {
              forecasts: [],
            },
          };
        }
      );

      const result = await tool.execute(input, mockContext);

      expect(result.forecasts).toHaveLength(0);
    });

    it("should respect maxDetailedAnalysis in scoring guidance", async () => {
      const input = {
        text: "Multiple predictions here",
        maxDetailedAnalysis: 1,
      };

      const mockInteraction = createMockLLMInteraction();

      // Mock extraction with 3 forecasts, only 1 scored high due to guidance
      mockCallClaudeWithTool.mockImplementationOnce(
        async (options, interactions) => {
          if (interactions) {
            interactions.push(mockInteraction);
          }
          return {
            response: {} as any,
            interaction: mockInteraction,
            toolResult: {
              forecasts: [
                {
                  originalText: "Forecast 1",
                  thinking: "Most relevant forecast",
                  precisionScore: 80,
                  verifiabilityScore: 85,
                  importanceScore: 75,
                  robustnessScore: 70,
                  rewrittenPredictionText: "Will forecast 1 occur?",
                  resolutionDate: "2025",
                  authorProbability: undefined,
                },
                {
                  originalText: "Forecast 2",
                  thinking:
                    "Moderate interest but limited by maxDetailedAnalysis",
                  precisionScore: 45,
                  verifiabilityScore: 50,
                  importanceScore: 40,
                  robustnessScore: 45,
                  rewrittenPredictionText: "Will forecast 2 occur?",
                  resolutionDate: "2026",
                  authorProbability: undefined,
                },
                {
                  originalText: "Forecast 3",
                  thinking: "Lower priority",
                  precisionScore: 30,
                  verifiabilityScore: 25,
                  importanceScore: 35,
                  robustnessScore: 30,
                  rewrittenPredictionText: "Will forecast 3 occur?",
                  resolutionDate: "2027",
                  authorProbability: undefined,
                },
              ],
            },
          };
        }
      );

      const result = await tool.execute(input, mockContext);

      expect(result.forecasts).toHaveLength(3);
      // Check scores
      expect(result.forecasts[0].precisionScore).toBe(80);
      expect(result.forecasts[0].verifiabilityScore).toBe(85);
      expect(result.forecasts[0].importanceScore).toBe(75);

      expect(result.forecasts[1].precisionScore).toBe(45);
      expect(result.forecasts[1].verifiabilityScore).toBe(50);
      expect(result.forecasts[1].importanceScore).toBe(40);

      expect(result.forecasts[2].precisionScore).toBe(30);
      expect(result.forecasts[2].verifiabilityScore).toBe(25);
      expect(result.forecasts[2].importanceScore).toBe(35);
    });

    it("should use agent instructions when provided", async () => {
      const input = {
        text: "Economic and tech predictions",
        agentInstructions: "Focus on economic predictions only",
      };

      const mockInteraction = createMockLLMInteraction({
        prompt:
          "Extract and score forecasts from this text:\n\nEconomic and tech predictions",
      });

      // Mock extraction
      mockCallClaudeWithTool.mockImplementationOnce(
        async (options, interactions) => {
          if (interactions) {
            interactions.push(mockInteraction);
          }
          return {
            response: {} as any,
            interaction: mockInteraction,
            toolResult: {
              forecasts: [
                {
                  originalText: "AI will surpass human intelligence by 2050",
                  thinking:
                    "Relevant technological prediction but not economic focus",
                  precisionScore: 20,
                  verifiabilityScore: 30,
                  importanceScore: 25,
                  robustnessScore: 35,
                  rewrittenPredictionText:
                    "Will AI achieve human-level intelligence by 2050?",
                  resolutionDate: "2050",
                  authorProbability: undefined,
                },
              ],
            },
          };
        }
      );

      const result = await tool.execute(input, mockContext);

      // Verify only one call was made
      expect(mockCallClaudeWithTool).toHaveBeenCalledTimes(1);

      // Verify agent instructions were included
      expect(mockCallClaudeWithTool).toHaveBeenCalledWith(
        expect.anything(),
        expect.any(Array)
      );

      // Verify low scores due to not matching instructions
      expect(result.forecasts[0].precisionScore).toBe(20);
      expect(result.forecasts[0].verifiabilityScore).toBe(30);
      expect(result.forecasts[0].importanceScore).toBe(25);
    });
  });
});
