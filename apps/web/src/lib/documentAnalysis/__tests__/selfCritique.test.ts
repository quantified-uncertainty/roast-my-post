import { generateSelfCritique } from "../selfCritique";
import type { Agent } from "@roast/ai";

// Mock logger to avoid console output
jest.mock("../../../lib/logger", () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

// Mock the @roast/ai module
jest.mock("@roast/ai", () => ({
  callClaudeWithTool: jest.fn(),
  MODEL_CONFIG: {
    analysis: "claude-sonnet-test",
    routing: "claude-3-haiku-20240307"
  },
  setupClaudeToolMock: jest.requireActual("@roast/ai").setupClaudeToolMock,
  createHeliconeHeaders: jest.fn(() => ({})),
  withTimeout: jest.fn((promise) => promise),
}));

// Mock withTimeout - no need to mock the submodule since it's imported from main package

import { callClaudeWithTool, setupClaudeToolMock } from "@roast/ai";

describe("Self-Critique", () => {
  let mockCallClaudeWithTool: jest.MockedFunction<typeof callClaudeWithTool>;
  let mockHelper: ReturnType<typeof setupClaudeToolMock>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up the mock helper
    mockCallClaudeWithTool = callClaudeWithTool as jest.MockedFunction<typeof callClaudeWithTool>;
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

    // Mock the self-critique response
    const mockToolResult = {
      selfCritique: "Score: 75/100\n\nThis evaluation demonstrates good structure and covers key points. However, the analysis could be more specific about implementation details."
    };
    mockHelper.mockToolResponse(mockToolResult);

    const result = await generateSelfCritique(mockEvaluation, mockAgent);

    expect(result.outputs.selfCritique).toBeDefined();
    expect(result.outputs.selfCritique).toContain("Score:");
    expect(result.task.name).toBe("generateSelfCritique");
  }, 10000); // Increase timeout to 10 seconds
});