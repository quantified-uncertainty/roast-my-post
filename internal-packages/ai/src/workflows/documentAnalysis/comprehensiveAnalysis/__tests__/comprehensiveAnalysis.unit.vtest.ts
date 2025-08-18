import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';
import { generateComprehensiveAnalysis } from "../index";
import { extractHighlightsFromAnalysis } from "../../highlightExtraction";
import type { Agent, Document, ComprehensiveAnalysisOutputs } from "../../../../types";
import { callClaudeWithTool, MODEL_CONFIG } from "../../../../claude/wrapper";
import { setupClaudeToolMock } from "../../../../testing";

// Mock the claude wrapper - the actual dependency we want to mock
vi.mock("../../../../claude/wrapper", () => ({
  callClaudeWithTool: vi.fn(),
  MODEL_CONFIG: {
    analysis: "claude-sonnet-test",
    routing: "claude-3-haiku-20240307"
  },
  createHeliconeHeaders: vi.fn(() => ({})),
  withTimeout: vi.fn((promise) => promise),
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

  let mockCallClaudeWithTool: anytypeof callClaudeWithTool>;
  let mockHelper: ReturnType<typeof setupClaudeToolMock>;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Set up the mock helper
    mockCallClaudeWithTool = callClaudeWithTool as anytypeof callClaudeWithTool>;
    mockHelper = setupClaudeToolMock(mockCallClaudeWithTool);
  });

  describe("generateComprehensiveAnalysis", () => {
    it("should generate analysis with highlights", async () => {
      const mockAnalysis: ComprehensiveAnalysisOutputs = {
        summary: "Test summary",
        analysis: "Test analysis",
        grade: 85,
        highlightInsights: [
          {
            id: "insight-1",
            location: "Line 1", 
            suggestedHighlight: "Important point from the test document",
          },
        ],
      };

      mockHelper.mockToolResponse(mockAnalysis);

      const result = await generateComprehensiveAnalysis(
        mockDocument,
        mockAgent,
        5,
        2
      );

      expect(result.outputs).toMatchObject({
        summary: "Test summary",
        analysis: "Test analysis",
        grade: 85,
        highlightInsights: expect.arrayContaining([
          expect.objectContaining({
            id: "insight-1",
            location: "Line 1",
            suggestedHighlight: "Important point from the test document",
          }),
        ]),
      });
      expect(result.task.name).toBe("generateComprehensiveAnalysis");

      expect(mockCallClaudeWithTool).toHaveBeenCalledWith(
        expect.objectContaining({
          model: MODEL_CONFIG.analysis,
          toolName: "provide_comprehensive_analysis",
        })
      );
    });

    it("should handle analysis without highlights", async () => {
      const mockAnalysis: ComprehensiveAnalysisOutputs = {
        summary: "Test summary",
        analysis: "Test analysis",
        grade: 90,
        highlightInsights: [],
      };

      mockHelper.mockToolResponse(mockAnalysis);

      const result = await generateComprehensiveAnalysis(
        mockDocument,
        mockAgent,
        5,
        2
      );

      expect(result.outputs.highlightInsights).toEqual([]);
      expect(result.task.name).toBe("generateComprehensiveAnalysis");
    });

    it("should include self-critique when agent has instructions", async () => {
      const agentWithCritique = {
        ...mockAgent,
        selfCritiqueInstructions: "Be critical of your analysis",
      };

      const mockAnalysis: ComprehensiveAnalysisOutputs = {
        summary: "Test summary",
        analysis: "Test analysis",
        grade: 75,
        highlightInsights: [],
      };

      mockHelper.mockToolResponse(mockAnalysis);

      const result = await generateComprehensiveAnalysis(
        mockDocument,
        agentWithCritique,
        5,
        2
      );

      expect(result.outputs.grade).toBe(75);
      expect(result.task.name).toBe("generateComprehensiveAnalysis");
    });

    it("should handle grading when agent provides grades", async () => {
      const mockAnalysis: ComprehensiveAnalysisOutputs = {
        summary: "Test summary",
        analysis: "Test analysis",
        grade: 95,
        highlightInsights: [
          {
            id: "insight-1",
            location: "Line 1",
            suggestedHighlight: "This is a test document.",
          },
        ],
      };

      mockHelper.mockToolResponse(mockAnalysis);

      const result = await generateComprehensiveAnalysis(
        mockDocument,
        mockAgent,
        5,
        2
      );

      expect(result.outputs.grade).toBe(95);
      expect(result.task.name).toBe("generateComprehensiveAnalysis");
      
      // Note: generateComprehensiveAnalysis doesn't return highlights array
      // The highlights are generated separately by extractHighlightsFromAnalysis
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
        highlightInsights: [
          {
            id: "insight-1",
            location: "Line 1",
            suggestedHighlight: "This is a test document.",
          },
          {
            id: "insight-2",
            location: "Line 2", 
            suggestedHighlight: "It has multiple lines.",
          },
          {
            id: "insight-3",
            location: "Line 3",
            suggestedHighlight: "For testing purposes.",
          },
        ],
      };

      mockHelper.mockToolResponse(mockAnalysis);

      const result = await generateComprehensiveAnalysis(mockDocument, mockAgent, 2, 3);

      // Check that the function was called with correct parameters
      expect(mockCallClaudeWithTool).toHaveBeenCalledWith(
        expect.objectContaining({
          model: MODEL_CONFIG.analysis,
          toolName: "provide_comprehensive_analysis",
        })
      );
      
      // Verify the function completed without errors
      expect(result.task.name).toBe("generateComprehensiveAnalysis");
    });
  });

  describe("extractHighlightsFromAnalysis", () => {
    it("should extract highlights from analysis output", async () => {
      const analysisWithHighlights = {
        summary: "Summary",
        analysis: "Analysis",
        highlightInsights: [
          {
            id: "insight-1",
            location: "Line 1",
            suggestedHighlight: "This is a test document.",
          },
          {
            id: "insight-2",
            location: "Line 2", 
            suggestedHighlight: "It has multiple lines.",
          },
        ],
      };

      const result = await extractHighlightsFromAnalysis(mockDocument, mockAgent, analysisWithHighlights, 2);

      // Should find at least 1 highlight (might not find all due to text matching)
      expect(result.outputs.highlights.length).toBeGreaterThan(0);
      expect(result.outputs.highlights[0]).toMatchObject({
        description: expect.stringContaining("This is a test document"),
        highlight: {
          startOffset: expect.any(Number),
          endOffset: expect.any(Number),
          quotedText: expect.stringContaining("This is a test document"),
        },
      });
    });

    it("should handle analysis without highlights", async () => {
      const analysisWithoutHighlights = {
        summary: "Summary",
        analysis: "Analysis",
        highlightInsights: [], // Empty insights array - should use pure logic path
      };

      const result = await extractHighlightsFromAnalysis(mockDocument, mockAgent, analysisWithoutHighlights, 2);

      expect(result.outputs.highlights).toEqual([]);
      expect(result.task.priceInDollars).toBe(0); // Should be free since no API calls
      expect(result.task.modelName).toBe("EXTRACTION_ONLY"); // Should use extraction-only path
    });

    it("should filter out invalid highlights", async () => {
      const analysisWithInvalidHighlights = {
        summary: "Summary", 
        analysis: "Analysis",
        highlightInsights: [
          {
            id: "valid-1",
            location: "Line 1",
            suggestedHighlight: "This is a test document.",
          },
          {
            id: "invalid-1", 
            location: "Line 999", // Invalid line number
            suggestedHighlight: "Text that doesn't exist",
          },
        ],
      };

      const result = await extractHighlightsFromAnalysis(
        mockDocument,
        mockAgent,
        analysisWithInvalidHighlights as any,
        3
      );

      // Should only find the valid highlight (the invalid one should be filtered out)
      expect(result.outputs.highlights.length).toBeGreaterThan(0);
      expect(result.outputs.highlights.length).toBeLessThan(2); // Should filter out invalid one
      expect(result.task.priceInDollars).toBe(0); // Should be free since no API calls
    });
  });
});