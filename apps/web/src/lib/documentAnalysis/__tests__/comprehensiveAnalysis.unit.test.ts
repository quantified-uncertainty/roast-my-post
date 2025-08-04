import { generateComprehensiveAnalysis } from "../comprehensiveAnalysis";
import { extractHighlightsFromAnalysis } from "../highlightExtraction";
import type { Agent } from "@roast/ai";
import type { Document } from "@roast/ai";
import type { ComprehensiveAnalysisOutputs } from "../comprehensiveAnalysis";

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

// Mock withTimeout from openai types
// withTimeout is now mocked in the main @roast/ai mock
import { callClaudeWithTool, setupClaudeToolMock } from "@roast/ai";

// Mock the cost calculator
jest.mock("../../../utils/costCalculator", () => ({
  calculateApiCost: jest.fn(() => 0.5), // Return 0.5 cents
  mapModelToCostModel: jest.fn(() => "claude-sonnet-test"),
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

  let mockCallClaudeWithTool: jest.MockedFunction<typeof callClaudeWithTool>;
  let mockHelper: ReturnType<typeof setupClaudeToolMock>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up the mock helper
    mockCallClaudeWithTool = callClaudeWithTool as jest.MockedFunction<typeof callClaudeWithTool>;
    mockHelper = setupClaudeToolMock(mockCallClaudeWithTool);
  });

  const mockDocument: Document = {
    id: "test-doc-1",
    slug: "test-doc",
    title: "Test Document",
    content: "Line 1: This is a test document.\nLine 2: It has multiple lines.\nLine 3: For testing purposes.",
    author: "Test Author",
    publishedDate: "2024-01-01",
    reviews: [],
    intendedAgents: ["test-agent-1"],
  };

  describe("generateComprehensiveAnalysis", () => {
    it("should generate structured analysis with highlight insights", async () => {

      // Mock the tool response
      const mockToolResult = {
        summary: "This is a test summary of the document.",
        analysis: `# Executive Summary

This document demonstrates effective structure and content organization.

## Key Insights for Highlightary

### 1. Opening Line Analysis
The opening line effectively establishes context and draws reader attention appropriately.

### 2. Structure Review  
The structural consistency aids readability throughout the document.

**Overall Grade**: 85/100 - Good test document with clear purpose`,
        grade: 85,
        highlightInsights: [
          {
            id: "insight-1",
            location: "Lines 1",
            suggestedHighlight: "Opening Line Analysis. The opening line effectively establishes context",
          },
          {
            id: "insight-2",
            location: "Lines 2-3",
            suggestedHighlight: "Structure Review. The structural consistency aids readability",
          },
        ],
      };

      mockHelper.mockToolResponse(mockToolResult);

      const result = await generateComprehensiveAnalysis(mockDocument, mockAgent, 1000);

      expect(result.outputs.summary).toBe("This is a test summary of the document.");
      expect(result.outputs.analysis).toContain("# Executive Summary");
      expect(result.outputs.analysis).toContain("## Key Insights for Highlightary");
      expect(result.outputs.grade).toBe(85);
      expect(result.outputs.highlightInsights).toHaveLength(2);
      expect(result.outputs.highlightInsights[0].id).toBe("insight-1");
      expect(result.task.name).toBe("generateComprehensiveAnalysis");
    });
  });

  describe("extractHighlightsFromAnalysis", () => {
    it("should extract highlights from analysis insights", async () => {
      const mockAnalysisOutputs: ComprehensiveAnalysisOutputs = {
        summary: "Test summary",
        analysis: "Test analysis with insights",
        grade: 85,
        highlightInsights: [
          {
            id: "insight-1",
            location: "Line 1", // Line 1 contains "Line 1: This is a test document."
            suggestedHighlight: "Line 1: This is a test document.",
          },
          {
            id: "insight-2",
            location: "Lines 2-3", // Lines 2-3 contain the remaining content
            suggestedHighlight: "Line 2: It has multiple lines.\nLine 3: For testing purposes.",
          },
        ],
      };

      const result = await extractHighlightsFromAnalysis(
        mockDocument,
        mockAgent,
        mockAnalysisOutputs,
        2
      );

      expect(result.outputs.highlights).toHaveLength(2);
      expect(result.outputs.highlights[0].description).toBe("Line 1: This is a test document.");
      expect(result.outputs.highlights[0].highlight!.startOffset).toBeDefined();
      expect(result.outputs.highlights[0].highlight!.endOffset).toBeDefined();
      expect(result.task.name).toBe("extractHighlightsFromAnalysis");
      expect(result.task.priceInDollars).toBe(0); // Should be free extraction
    });

    it.skip("should fall back to LLM extraction when no insights provided", async () => {
      const mockAnalysisOutputs: ComprehensiveAnalysisOutputs = {
        summary: "Test summary",
        analysis: "Test analysis without structured insights",
        highlightInsights: [],
      };

      const mockResponse = {
        content: [
          {
            type: "tool_use",
            name: "provide_highlights",
            input: {
              highlights: [
                {
                  description: "Extracted Highlight. Highlight extracted via LLM",
                  importance: 5,
                  highlight: {
                    startLineIndex: 0,
                    endLineIndex: 0,
                    startCharacters: "Line 1:",
                    endCharacters: "document.",
                  },
                },
              ],
            },
          },
        ],
        usage: {
          input_tokens: 50,
          output_tokens: 100,
        },
      };

      // Mock the highlight extraction tool response
      const mockHighlightToolResult = {
        highlights: [
          {
            id: "extracted-1",
            description: "Extracted Highlight: This is a test highlight",
            importance: 8,
            isValid: true,
            highlight: {
              startOffset: 0,
              endOffset: 12,
              quotedText: "Test Content",
              isValid: true,
            },
          },
        ],
      };

      mockHelper.mockToolResponse(mockHighlightToolResult);

      const result = await extractHighlightsFromAnalysis(
        mockDocument,
        mockAgent,
        mockAnalysisOutputs,
        1
      );

      expect(result.outputs.highlights).toHaveLength(1);
      expect(result.outputs.highlights[0].description).toContain("Extracted Highlight");
      expect(result.task.priceInDollars).toBeGreaterThan(0); // Should have cost for LLM
    });
  });
});