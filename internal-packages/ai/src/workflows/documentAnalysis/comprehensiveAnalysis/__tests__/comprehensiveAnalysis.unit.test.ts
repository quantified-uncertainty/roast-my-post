import { generateComprehensiveAnalysis } from "../index";
import { extractHighlightsFromAnalysis } from "../../highlightExtraction";
import type { Agent, Document, ComprehensiveAnalysisOutputs } from "@roast/ai";
import { callClaudeWithTool, MODEL_CONFIG } from "@roast/ai";
import { setupClaudeToolMock } from "../../../../testing";

// Mock the @roast/ai module  
jest.mock("@roast/ai", () => ({
  callClaudeWithTool: jest.fn(),
  MODEL_CONFIG: {
    analysis: "claude-sonnet-test",
    routing: "claude-3-haiku-20240307"
  },
  createHeliconeHeaders: jest.fn(() => ({})),
  setupClaudeToolMock: jest.requireActual("@roast/ai").setupClaudeToolMock,
  withTimeout: jest.fn((promise) => promise),
}));

describe("Comprehensive Analysis Unit Tests", () => {
  const mockAgent: Agent = {
    id: "test-agent-1",
    name: "Test Agent",
    version: "1.0",
    description: "A test agent",
    primaryInstructions: "Test instructions",
    providesGrades: true,
  };

  const mockDocument: Document = {
    id: "test-doc-1",
    slug: "test-doc",
    title: "Test Document",
    content: "This is a test document with some content to analyze. It contains important points that should be highlighted.",
    author: "Test Author",
    publishedDate: "2024-01-01",
    url: "https://example.com/test",
    platforms: ["test"],
    reviews: [],
    intendedAgents: ["test-agent-1"],
  };

  let mockCallClaudeWithTool: jest.MockedFunction<typeof callClaudeWithTool>;
  let mockHelper: ReturnType<typeof setupClaudeToolMock>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up the mock helper
    mockCallClaudeWithTool = callClaudeWithTool as jest.MockedFunction<typeof callClaudeWithTool>;
    mockHelper = setupClaudeToolMock(mockCallClaudeWithTool);
  });

  describe("generateComprehensiveAnalysis", () => {
    it("should generate analysis with highlights", async () => {
      const mockAnalysis: ComprehensiveAnalysisOutputs = {
        summary: "Test summary",
        analysis: "Test analysis",
        grade: "B",
        highlights: [
          {
            description: "Important point",
            importance: "high",
            highlight: {
              startOffset: 10,
              endOffset: 30,
              quotedText: "test document with",
            },
          },
        ],
      };

      mockHelper.mockToolResponse("comprehensive_analysis", mockAnalysis);

      const result = await generateComprehensiveAnalysis(
        mockDocument,
        mockAgent,
        5,
        2
      );

      expect(result).toMatchObject({
        summary: "Test summary",
        analysis: "Test analysis",
        grade: "B",
        highlights: expect.arrayContaining([
          expect.objectContaining({
            description: "Important point",
            importance: "high",
          }),
        ]),
      });

      expect(mockCallClaudeWithTool).toHaveBeenCalledWith(
        expect.objectContaining({
          model: MODEL_CONFIG.analysis,
          tools: expect.arrayContaining([
            expect.objectContaining({
              name: "comprehensive_analysis",
            }),
          ]),
        })
      );
    });

    it("should handle analysis without highlights", async () => {
      const mockAnalysis: ComprehensiveAnalysisOutputs = {
        summary: "Test summary",
        analysis: "Test analysis",
        grade: "A",
        highlights: [],
      };

      mockHelper.mockToolResponse("comprehensive_analysis", mockAnalysis);

      const result = await generateComprehensiveAnalysis(
        mockDocument,
        mockAgent,
        5,
        2
      );

      expect(result.highlights).toEqual([]);
    });

    it("should include self-critique when agent has instructions", async () => {
      const agentWithCritique = {
        ...mockAgent,
        selfCritiqueInstructions: "Be critical of your analysis",
      };

      const mockAnalysis: ComprehensiveAnalysisOutputs = {
        summary: "Test summary",
        analysis: "Test analysis",
        grade: "C",
        selfCritique: "I should have been more thorough",
        highlights: [],
      };

      mockHelper.mockToolResponse("comprehensive_analysis", mockAnalysis);

      const result = await generateComprehensiveAnalysis(
        mockDocument,
        agentWithCritique,
        5,
        2
      );

      expect(result.selfCritique).toBe("I should have been more thorough");
    });

    it("should handle grading when agent provides grades", async () => {
      const mockAnalysis: ComprehensiveAnalysisOutputs = {
        summary: "Test summary",
        analysis: "Test analysis",
        grade: "A+",
        highlights: [
          {
            description: "Excellent point",
            importance: "critical",
            grade: "A",
            highlight: {
              startOffset: 0,
              endOffset: 10,
              quotedText: "This is a",
            },
          },
        ],
      };

      mockHelper.mockToolResponse("comprehensive_analysis", mockAnalysis);

      const result = await generateComprehensiveAnalysis(
        mockDocument,
        mockAgent,
        5,
        2
      );

      expect(result.grade).toBe("A+");
      expect(result.highlights[0].grade).toBe("A");
    });

    it("should handle API errors gracefully", async () => {
      mockCallClaudeWithTool.mockRejectedValueOnce(
        new Error("API request failed")
      );

      await expect(
        generateComprehensiveAnalysis(mockDocument, mockAgent, 5, 2)
      ).rejects.toThrow("API request failed");
    });

    it("should respect max highlights and min importance parameters", async () => {
      const mockAnalysis: ComprehensiveAnalysisOutputs = {
        summary: "Test summary",
        analysis: "Test analysis",
        highlights: [
          {
            description: "Critical point",
            importance: "critical",
            highlight: { startOffset: 0, endOffset: 10, quotedText: "This is a" },
          },
          {
            description: "High importance",
            importance: "high",
            highlight: { startOffset: 20, endOffset: 30, quotedText: "document" },
          },
          {
            description: "Medium importance",
            importance: "medium",
            highlight: { startOffset: 40, endOffset: 50, quotedText: "content" },
          },
          {
            description: "Low importance",
            importance: "low",
            highlight: { startOffset: 60, endOffset: 70, quotedText: "analyze" },
          },
        ],
      };

      mockHelper.mockToolResponse("comprehensive_analysis", mockAnalysis);

      await generateComprehensiveAnalysis(mockDocument, mockAgent, 2, 3);

      // Check that the correct parameters were passed to the API
      const callArgs = mockCallClaudeWithTool.mock.calls[0][0];
      expect(callArgs.messages[0].content).toContain("2");
      expect(callArgs.messages[0].content).toContain("high");
    });
  });

  describe("extractHighlightsFromAnalysis", () => {
    it("should extract highlights from analysis output", () => {
      const analysisWithHighlights = {
        summary: "Summary",
        analysis: "Analysis",
        highlights: [
          {
            description: "Point 1",
            importance: "high",
            highlight: {
              startOffset: 0,
              endOffset: 10,
              quotedText: "This is a",
            },
          },
          {
            description: "Point 2",
            importance: "medium",
            highlight: {
              startOffset: 20,
              endOffset: 30,
              quotedText: "document",
            },
          },
        ],
      };

      const highlights = extractHighlightsFromAnalysis(analysisWithHighlights);

      expect(highlights).toHaveLength(2);
      expect(highlights[0]).toMatchObject({
        description: "Point 1",
        importance: "high",
        highlight: {
          startOffset: 0,
          endOffset: 10,
          quotedText: "This is a",
        },
      });
    });

    it("should handle analysis without highlights", () => {
      const analysisWithoutHighlights = {
        summary: "Summary",
        analysis: "Analysis",
      };

      const highlights = extractHighlightsFromAnalysis(analysisWithoutHighlights);

      expect(highlights).toEqual([]);
    });

    it("should filter out invalid highlights", () => {
      const analysisWithInvalidHighlights = {
        summary: "Summary",
        analysis: "Analysis",
        highlights: [
          {
            description: "Valid highlight",
            importance: "high",
            highlight: {
              startOffset: 0,
              endOffset: 10,
              quotedText: "This is a",
            },
          },
          {
            description: "Invalid - no highlight object",
            importance: "high",
          },
          {
            description: "Invalid - missing offsets",
            importance: "medium",
            highlight: {
              quotedText: "document",
            },
          },
        ],
      };

      const highlights = extractHighlightsFromAnalysis(
        analysisWithInvalidHighlights as any
      );

      expect(highlights).toHaveLength(1);
      expect(highlights[0].description).toBe("Valid highlight");
    });
  });
});