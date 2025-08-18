import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';
import { generateSelfCritique } from "../selfCritique";
import type { Agent } from "@roast/ai";

// Mock logger to avoid console output
vi.mock("../../../utils/logger", () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  }
}));

// Mock the @roast/ai module
vi.mock("@roast/ai", () => ({
  callClaudeWithTool: vi.fn(),
  MODEL_CONFIG: {
    analysis: "claude-sonnet-test",
    routing: "claude-3-haiku-20240307"
  },
  setupClaudeToolMock: vi.importActual("@roast/ai").setupClaudeToolMock,
  createHeliconeHeaders: vi.fn(() => ({})),
  withTimeout: vi.fn((promise) => promise),
}));

// Mock withTimeout - no need to mock the submodule since it's imported from main package

import { callClaudeWithTool } from "@roast/ai";
import { setupClaudeToolMock } from "../../../testing";

describe("Self-Critique", () => {
  let mockCallClaudeWithTool: typeof callClaudeWithTool;
  let mockHelper: ReturnType<typeof setupClaudeToolMock>;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Set up the mock helper
    mockCallClaudeWithTool = callClaudeWithTool as any;
    mockHelper = setupClaudeToolMock(mockCallClaudeWithTool);
  });

  it("should generate self-critique for evaluation output", async () => {
    const mockAgent: Agent = {
      id: "test-agent",
      name: "Test Critic",
      description: "A test agent for critiquing",
      version: "1",
      selfCritiqueInstructions: "Focus on accuracy and completeness of the evaluation.",
      providesGrades: true,
    };

    const mockEvaluation = {
      summary: "This is a test summary of an evaluation.",
      analysis: "This is a detailed analysis that covers multiple aspects of the document.",
      grade: 85,
      comments: [
        { title: "Good Point", text: "This is well written." },
        { title: "Could Improve", text: "This needs more detail." }
      ]
    };

    // Mock the self-critique response directly
    const mockClaudeResponse = {
      response: {
        content: [{
          type: 'tool_use',
          input: {
            selfCritique: "Score: 75/100\n\nThis evaluation demonstrates good structure and covers key points. However, the analysis could be more specific about implementation details."
          }
        }],
        usage: { input_tokens: 100, output_tokens: 50 }
      },
      interaction: {
        model: 'claude-3-haiku-20240307',
        prompt: 'test prompt',
        response: 'test response',
        tokensUsed: { prompt: 100, completion: 50, total: 150 },
        timestamp: new Date(),
        duration: 500
      },
      toolResult: {
        selfCritique: "Score: 75/100\n\nThis evaluation demonstrates good structure and covers key points. However, the analysis could be more specific about implementation details."
      }
    };
    
    mockCallClaudeWithTool.mockImplementationOnce(() => Promise.resolve(mockClaudeResponse));

    const result = await generateSelfCritique(mockEvaluation, mockAgent);

    expect(result.outputs.selfCritique).toBeDefined();
    expect(result.outputs.selfCritique).toContain("Score:");
    expect(result.task.name).toBe("generateSelfCritique");
    expect(mockCallClaudeWithTool).toHaveBeenCalledTimes(1);
  }, 30000); // Increase timeout to 30 seconds
});