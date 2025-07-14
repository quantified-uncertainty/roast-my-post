import { generateComprehensiveAnalysis } from "../comprehensiveAnalysis";
import { extractHighlightsFromAnalysis } from "../highlightExtraction";
import type { Agent } from "../../../types/agentSchema";
import type { Document } from "../../../types/documents";
import type { ComprehensiveAnalysisOutputs } from "../comprehensiveAnalysis";

// Mock the Anthropic client
jest.mock("../../../types/openai", () => ({
  anthropic: {
    messages: {
      create: jest.fn(),
    },
  },
  ANALYSIS_MODEL: "claude-sonnet-test",
  DEFAULT_TEMPERATURE: 0.1,
  withTimeout: jest.fn((promise) => promise),
}));

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
      const mockResponse = {
        content: [
          {
            type: "tool_use",
            name: "provide_comprehensive_analysis",
            input: {
              summary: "This is a test summary of the document.",
              analysis: `# Executive Summary
This is a comprehensive analysis of the test document.

## Overview
The document presents a simple test case with three lines of content.

## Detailed Analysis
The content is minimal but serves its testing purpose well.

## Key Insights for Highlightary

### Insight 1: Opening Line Analysis {#insight-1}
- **Location**: Lines 1
- **Observation**: The opening line clearly states the document's purpose
- **Significance**: Sets expectations for the reader
- **Suggested Highlight**: The opening line effectively establishes context

### Insight 2: Structure Review {#insight-2}
- **Location**: Lines 2-3
- **Observation**: The document maintains consistent structure
- **Significance**: Easy to follow and understand
- **Suggested Highlight**: The structural consistency aids readability

## Quality Assessment
Overall, this is a well-structured test document.

## Grade
85/100 - Good test document with clear purpose`,
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
            },
          },
        ],
        usage: {
          input_tokens: 100,
          output_tokens: 500,
        },
      };

      const { anthropic } = require("../../../types/openai");
      anthropic.messages.create.mockResolvedValue(mockResponse);

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
            location: "Lines 1",
            suggestedHighlight: "Test Highlight 1. This is the first highlight text",
          },
          {
            id: "insight-2",
            location: "Lines 2-3",
            suggestedHighlight: "Test Highlight 2. This is the second highlight text",
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
      expect(result.outputs.highlights[0].description).toBe("Test Highlight 1. This is the first highlight text");
      expect(result.outputs.highlights[0].highlight.startOffset).toBeDefined();
      expect(result.outputs.highlights[0].highlight.endOffset).toBeDefined();
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

      const { anthropic } = require("../../../types/openai");
      anthropic.messages.create.mockResolvedValue(mockResponse);

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