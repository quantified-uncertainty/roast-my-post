import { generateComprehensiveAnalysis } from "../comprehensiveAnalysis";
import { extractHighlightsFromAnalysis } from "../highlightExtraction";
import type { Agent } from "@roast/ai";
import type { Document } from "@roast/ai";
import { createTestDocument, adjustLineReferences, adjustLineReference, getPrependLineCount } from "../testUtils";

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

// Mock the cost calculator
jest.mock("../../../utils/costCalculator", () => ({
  calculateApiCost: jest.fn(() => 0.5),
  mapModelToCostModel: jest.fn(() => "claude-sonnet-test"),
}));

// Mock withTimeout from openai types
// withTimeout is now mocked in the main @roast/ai mock
import { callClaudeWithTool, MODEL_CONFIG } from "@roast/ai";
import { setupClaudeToolMock } from "../../../testing";
import type { ClaudeCallResult } from "@roast/ai";
import { withTimeout } from "@roast/ai";

describe("Comprehensive Analysis Highlights to Highlights E2E", () => {
  const mockAgent: Agent = {
    id: "test-agent-1",
    name: "Test Agent",
    version: "1.0",
    description: "A test agent",
    primaryInstructions: "Test instructions",
    providesGrades: false,
  };

  let mockCallClaudeWithTool: jest.MockedFunction<typeof callClaudeWithTool>;
  let mockHelper: ReturnType<typeof setupClaudeToolMock>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up the mock helper
    mockCallClaudeWithTool = callClaudeWithTool as jest.MockedFunction<typeof callClaudeWithTool>;
    mockHelper = setupClaudeToolMock(mockCallClaudeWithTool);
  });

  const mockDocumentContent = `This is line 1 with some content.
Line 2 has different text here.
Line 3 contains important information.
Line 4 is just filler text.
Line 5 has the final content.`;

  const mockDocument: Document = createTestDocument(mockDocumentContent, {
    id: "test-doc-1",
    title: "Test Document",
    author: "Test Author",
    publishedDate: "2024-01-01",
    includePrepend: true
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("all highlights from comprehensive analysis should become highlights", async () => {
    
    // Get the number of lines added by prepend
    const prependLineCount = getPrependLineCount(mockDocument);
    
    // Use helper to adjust line references dynamically
    const contentLineRefs = [
      "Line 1",
      "Lines 2-3", 
      "Line 3",
      "Line 4",
      "Line 5"
    ];
    const adjustedRefs = adjustLineReferences(contentLineRefs, prependLineCount);
    
    // Mock comprehensive analysis response with 5 highlights
    const mockToolResult = {
      summary: "Test summary",
      analysis: "# Analysis\\n\\n## Overview\\nTest analysis content\\n\\n## Key Highlights\\n\\nHighlights listed below",
      highlightInsights: [
        {
          id: "insight-1",
          location: adjustedRefs[0], // Dynamically calculated
          suggestedHighlight: "This is line 1 with some content."
        },
        {
          id: "insight-2", 
          location: adjustedRefs[1], // Dynamically calculated
          suggestedHighlight: "Line 2 has different text here.\nLine 3 contains important information."
        },
        {
          id: "insight-3",
          location: adjustedRefs[2], // Dynamically calculated
          suggestedHighlight: "Line 3 contains important information."
        },
        {
          id: "insight-4",
          location: adjustedRefs[3], // Dynamically calculated
          suggestedHighlight: "Line 4 is just filler text."
        },
        {
          id: "insight-5",
          location: adjustedRefs[4], // Dynamically calculated
          suggestedHighlight: "Line 5 has the final content."
        }
      ]
    };

    mockHelper.mockToolResponse(mockToolResult);

    // Step 1: Generate comprehensive analysis with 5 target highlights
    const analysisResult = await generateComprehensiveAnalysis(
      mockDocument,
      mockAgent,
      500,
      5 // Request 5 highlights
    );

    // Verify we got 5 insights
    expect(analysisResult.outputs.highlightInsights).toHaveLength(5);
    console.log(`Generated ${analysisResult.outputs.highlightInsights.length} insights`);

    // Step 2: Extract highlights from the analysis
    const highlightResult = await extractHighlightsFromAnalysis(
      mockDocument,
      mockAgent,
      analysisResult.outputs,
      5 // Target 5 highlights
    );

    // Verify all 5 insights became highlights
    expect(highlightResult.outputs.highlights).toHaveLength(5);
    console.log(`Extracted ${highlightResult.outputs.highlights.length} highlights`);

    // Verify highlight details
    highlightResult.outputs.highlights.forEach((highlight, index) => {
      console.log(`Highlight ${index + 1}: "${highlight.description?.substring(0, 50) || 'No description'}..."`);
      expect(highlight.description).toBe(analysisResult.outputs.highlightInsights[index].suggestedHighlight);
      expect(highlight.highlight).toBeDefined();
      expect(highlight.highlight?.startOffset).toBeGreaterThanOrEqual(0);
      expect(highlight.highlight?.endOffset).toBeGreaterThan(highlight.highlight?.startOffset || 0);
    });
  });

  test("handles line number mismatches with fuzzy matching", async () => {
    
    // Get the number of lines added by prepend
    const prependLineCount = getPrependLineCount(mockDocument);
    
    // Create line references with intentional off-by-one errors
    const wrongRefs = [
      adjustLineReference("Line 2", prependLineCount), // Actually line 1
      adjustLineReference("Line 3", prependLineCount)  // For case mismatch test
    ];
    
    // Mock response with intentionally wrong line numbers
    const mockToolResult = {
      summary: "Test summary",
      analysis: "Test analysis",
      highlightInsights: [
        {
          id: "insight-1",
          location: wrongRefs[0], // Dynamically calculated wrong line
          suggestedHighlight: "This is line 1 with some content."
        },
        {
          id: "insight-2",
          location: wrongRefs[1], // Dynamically calculated
          suggestedHighlight: "Line 3 contains important information."
        }
      ]
    };

    mockHelper.mockToolResponse(mockToolResult);

    const analysisResult = await generateComprehensiveAnalysis(
      mockDocument,
      mockAgent,
      500,
      2
    );

    const highlightResult = await extractHighlightsFromAnalysis(
      mockDocument,
      mockAgent,
      analysisResult.outputs,
      2
    );

    // Should still get 2 highlights despite line mismatches
    expect(highlightResult.outputs.highlights).toHaveLength(2);
  });

  test("skips invalid highlights gracefully", async () => {
    
    // Mock response with some invalid highlights
    const mockToolResult = {
      summary: "Test summary",
      analysis: "Test analysis",
      highlightInsights: [
        {
          id: "insight-1",
          location: "Line 1",
          suggestedHighlight: "This is line 1 with some content."
        },
        {
          id: "insight-2",
          location: "Line 999", // Way out of bounds
          suggestedHighlight: "This text does not exist anywhere"
        },
        {
          id: "insight-3",
          location: "Line 3",
          suggestedHighlight: "Line 3 contains important information."
        }
      ]
    };

    mockHelper.mockToolResponse(mockToolResult);

    const analysisResult = await generateComprehensiveAnalysis(
      mockDocument,
      mockAgent,
      500,
      3
    );

    expect(analysisResult.outputs.highlightInsights).toHaveLength(3);

    const highlightResult = await extractHighlightsFromAnalysis(
      mockDocument,
      mockAgent,
      analysisResult.outputs,
      3
    );

    // Should get 2 valid highlights, skipping the invalid one
    expect(highlightResult.outputs.highlights).toHaveLength(2);
    expect(highlightResult.outputs.highlights[0].description).toBe("This is line 1 with some content.");
    expect(highlightResult.outputs.highlights[1].description).toBe("Line 3 contains important information.");
  });
});