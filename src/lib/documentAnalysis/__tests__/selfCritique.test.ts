import { generateSelfCritique } from "../selfCritique";
import type { Agent } from "../../../types/agentSchema";

describe("Self-Critique", () => {
  it("should generate self-critique for evaluation output", async () => {
    const mockAgent: Agent = {
      id: "test-agent",
      name: "Test Critic",
      purpose: "ASSESSOR",
      description: "A test agent for critiquing",
      version: "1",
      selfCritiqueInstructions: "Focus on accuracy and completeness of the evaluation.",
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

    // Mock the Anthropic API response
    jest.mock("../../../types/openai", () => ({
      ...jest.requireActual("../../../types/openai"),
      anthropic: {
        messages: {
          create: jest.fn().mockResolvedValue({
            content: [{
              type: "tool_use",
              name: "provide_self_critique",
              input: {
                selfCritique: "Score: 75/100\n\nThis evaluation demonstrates good structure..."
              }
            }],
            usage: { input_tokens: 100, output_tokens: 50 }
          })
        }
      }
    }));

    const result = await generateSelfCritique(mockEvaluation, mockAgent);

    expect(result.outputs.selfCritique).toBeDefined();
    expect(result.outputs.selfCritique).toContain("Score:");
    expect(result.task.name).toBe("generateSelfCritique");
  });
});