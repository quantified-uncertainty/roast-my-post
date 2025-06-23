import { generateComprehensiveAnalysis } from "../comprehensiveAnalysis";
import { extractCommentsFromAnalysis } from "../commentExtraction";
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
    purpose: "ADVISOR",
    description: "A test agent",
    genericInstructions: "Test instructions",
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
    it("should generate structured analysis with comment insights", async () => {
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

## Key Insights for Commentary

### Insight 1: Opening Line Analysis {#insight-1}
- **Location**: Lines 1
- **Observation**: The opening line clearly states the document's purpose
- **Significance**: Sets expectations for the reader
- **Suggested Comment**: The opening line effectively establishes context

### Insight 2: Structure Review {#insight-2}
- **Location**: Lines 2-3
- **Observation**: The document maintains consistent structure
- **Significance**: Easy to follow and understand
- **Suggested Comment**: The structural consistency aids readability

## Quality Assessment
Overall, this is a well-structured test document.

## Grade
85/100 - Good test document with clear purpose`,
              grade: 85,
              selfCritique: "My analysis focused primarily on structure but could have delved deeper into content quality and potential improvements. The assessment may be somewhat superficial given the limited content available.",
              commentInsights: [
                {
                  id: "insight-1",
                  title: "Opening Line Analysis",
                  location: "Lines 1",
                  observation: "The opening line clearly states the document's purpose",
                  significance: "Sets expectations for the reader",
                  suggestedComment: "The opening line effectively establishes context",
                },
                {
                  id: "insight-2",
                  title: "Structure Review",
                  location: "Lines 2-3",
                  observation: "The document maintains consistent structure",
                  significance: "Easy to follow and understand",
                  suggestedComment: "The structural consistency aids readability",
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
      expect(result.outputs.analysis).toContain("## Key Insights for Commentary");
      expect(result.outputs.grade).toBe(85);
      expect(result.outputs.commentInsights).toHaveLength(2);
      expect(result.outputs.commentInsights[0].id).toBe("insight-1");
      expect(result.task.name).toBe("generateComprehensiveAnalysis");
    });
  });

  describe("extractCommentsFromAnalysis", () => {
    it("should extract comments from analysis insights", async () => {
      const mockAnalysisOutputs: ComprehensiveAnalysisOutputs = {
        summary: "Test summary",
        analysis: "Test analysis with insights",
        grade: 85,
        commentInsights: [
          {
            id: "insight-1",
            title: "Test Comment 1",
            location: "Lines 1",
            observation: "First observation",
            significance: "Why it matters",
            suggestedComment: "This is the first comment text",
          },
          {
            id: "insight-2",
            title: "Test Comment 2",
            location: "Lines 2-3",
            observation: "Second observation",
            significance: "Also important",
            suggestedComment: "This is the second comment text",
          },
        ],
      };

      const result = await extractCommentsFromAnalysis(
        mockDocument,
        mockAgent,
        mockAnalysisOutputs,
        2
      );

      expect(result.outputs.comments).toHaveLength(2);
      expect(result.outputs.comments[0].title).toBe("Test Comment 1");
      expect(result.outputs.comments[0].description).toBe("This is the first comment text");
      expect(result.outputs.comments[0].highlight.startOffset).toBeDefined();
      expect(result.outputs.comments[0].highlight.endOffset).toBeDefined();
      expect(result.task.name).toBe("extractCommentsFromAnalysis");
      expect(result.task.priceInCents).toBe(0); // Should be free extraction
    });

    it("should fall back to LLM extraction when no insights provided", async () => {
      const mockAnalysisOutputs: ComprehensiveAnalysisOutputs = {
        summary: "Test summary",
        analysis: "Test analysis without structured insights",
        commentInsights: [],
      };

      const mockResponse = {
        content: [
          {
            type: "tool_use",
            name: "provide_comments",
            input: {
              comments: [
                {
                  title: "Extracted Comment",
                  description: "Comment extracted via LLM",
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

      const result = await extractCommentsFromAnalysis(
        mockDocument,
        mockAgent,
        mockAnalysisOutputs,
        1
      );

      expect(result.outputs.comments).toHaveLength(1);
      expect(result.outputs.comments[0].title).toBe("Extracted Comment");
      expect(result.task.priceInCents).toBeGreaterThan(0); // Should have cost for LLM
    });
  });
});