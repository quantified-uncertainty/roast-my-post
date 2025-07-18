import { generateComprehensiveAnalysis } from "../comprehensiveAnalysis";
import { extractHighlightsFromAnalysis } from "../highlightExtraction";
import type { Agent } from "../../../types/agentSchema";
import type { Document } from "../../../types/documents";
import { createTestDocument, adjustLineReferences, adjustLineReference, getPrependLineCount } from "../testUtils";

// Mock the Anthropic client
jest.mock("../../../types/openai", () => ({
  createAnthropicClient: jest.fn(() => ({
    messages: {
      create: jest.fn(),
    },
  })),
  ANALYSIS_MODEL: "claude-sonnet-test",
  DEFAULT_TEMPERATURE: 0.1,
  withTimeout: jest.fn((promise) => promise),
}));

// Mock the cost calculator
jest.mock("../../../utils/costCalculator", () => ({
  calculateApiCost: jest.fn(() => 0.5),
  mapModelToCostModel: jest.fn(() => "claude-sonnet-test"),
}));

import { createAnthropicClient } from "../../../types/openai";

describe("Comprehensive Analysis Highlights to Highlights E2E", () => {
  const mockAgent: Agent = {
    id: "test-agent-1",
    name: "Test Agent",
    version: "1.0",
    description: "A test agent",
    primaryInstructions: "Test instructions",
    providesGrades: false,
  };

  let mockAnthropicCreate: jest.MockedFunction<any>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up the mock for createAnthropicClient
    mockAnthropicCreate = jest.fn();
    (createAnthropicClient as jest.MockedFunction<typeof createAnthropicClient>).mockReturnValue({
      messages: {
        create: mockAnthropicCreate,
      },
    } as any);
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
    const mockAnalysisResponse = {
      content: [
        {
          type: "tool_use",
          name: "provide_comprehensive_analysis",
          input: {
            summary: "Test summary",
            analysis: "# Analysis\\n\\n## Overview\\nTest analysis content\\n\\n## Key Highlights\\n\\nHighlights listed below",
            highlightInsights: [
              {
                id: "insight-1",
                location: adjustedRefs[0], // Dynamically calculated
                suggestedHighlight: "Highlight 1 text"
              },
              {
                id: "insight-2", 
                location: adjustedRefs[1], // Dynamically calculated
                suggestedHighlight: "Highlight 2 text"
              },
              {
                id: "insight-3",
                location: adjustedRefs[2], // Dynamically calculated
                suggestedHighlight: "Highlight 3 text"
              },
              {
                id: "insight-4",
                location: adjustedRefs[3], // Dynamically calculated
                suggestedHighlight: "Highlight 4 text"
              },
              {
                id: "insight-5",
                location: adjustedRefs[4], // Dynamically calculated
                suggestedHighlight: "Highlight 5 text"
              }
            ]
          }
        }
      ],
      usage: { input_tokens: 100, output_tokens: 200 }
    };

    mockAnthropicCreate.mockResolvedValueOnce(mockAnalysisResponse);

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
      console.log(`Highlight ${index + 1}: "${highlight.description.substring(0, 50)}..."`);
      expect(highlight.description).toBe(analysisResult.outputs.highlightInsights[index].suggestedHighlight);
      expect(highlight.highlight).toBeDefined();
      expect(highlight.highlight.startOffset).toBeGreaterThanOrEqual(0);
      expect(highlight.highlight.endOffset).toBeGreaterThan(highlight.highlight.startOffset);
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
    const mockAnalysisResponse = {
      content: [
        {
          type: "tool_use",
          name: "provide_comprehensive_analysis",
          input: {
            summary: "Test summary",
            analysis: "Test analysis",
            highlightInsights: [
              {
                id: "insight-1",
                location: wrongRefs[0], // Dynamically calculated wrong line
                suggestedHighlight: "Should find 'line 1' text"
              },
              {
                id: "insight-2",
                location: wrongRefs[1], // Dynamically calculated
                suggestedHighlight: "Should find 'IMPORTANT' as 'important'"
              }
            ]
          }
        }
      ],
      usage: { input_tokens: 100, output_tokens: 200 }
    };

    mockAnthropicCreate.mockResolvedValueOnce(mockAnalysisResponse);

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
    const mockAnalysisResponse = {
      content: [
        {
          type: "tool_use",
          name: "provide_comprehensive_analysis",
          input: {
            summary: "Test summary",
            analysis: "Test analysis",
            highlightInsights: [
              {
                id: "insight-1",
                location: "Line 1",
                suggestedHighlight: "Good highlight"
              },
              {
                id: "insight-2",
                location: "Line 999", // Way out of bounds
                suggestedHighlight: "Bad highlight"
              },
              {
                id: "insight-3",
                location: "Line 3",
                suggestedHighlight: "Another good highlight"
              }
            ]
          }
        }
      ],
      usage: { input_tokens: 100, output_tokens: 200 }
    };

    mockAnthropicCreate.mockResolvedValueOnce(mockAnalysisResponse);

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
    expect(highlightResult.outputs.highlights[0].description).toBe("Good highlight");
    expect(highlightResult.outputs.highlights[1].description).toBe("Another good highlight");
  });
});