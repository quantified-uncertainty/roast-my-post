import { generateSelfCritique } from "../selfCritique";
import type { Agent } from "../../../types/agentSchema";

// Mock logger to avoid console output
jest.mock("../../../lib/logger", () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

// Mock the entire openai module
jest.mock("../../../types/openai", () => ({
  anthropic: {
    messages: {
      create: jest.fn().mockResolvedValue({
        content: [{
          type: "tool_use",
          name: "provide_self_critique",
          input: {
            selfCritique: "Score: 75/100\n\nThis evaluation demonstrates good structure and covers key points. However, the analysis could be more specific about implementation details."
          }
        }],
        usage: { input_tokens: 100, output_tokens: 50 }
      })
    }
  },
  withTimeout: jest.fn((fn, timeout) => fn)
}));

describe("Self-Critique", () => {
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

    const result = await generateSelfCritique(mockEvaluation, mockAgent);

    expect(result.outputs.selfCritique).toBeDefined();
    expect(result.outputs.selfCritique).toContain("Score:");
    expect(result.task.name).toBe("generateSelfCritique");
  }, 10000); // Increase timeout to 10 seconds
});