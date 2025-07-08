import { generateComprehensiveAnalysis } from "../comprehensiveAnalysis";
import { extractHighlightsFromAnalysis } from "../highlightExtraction";
import type { Agent } from "../../../types/agentSchema";
import type { Document } from "../../../types/documents";
import { createTestDocument, adjustLineReferences, adjustLineReference, getPrependLineCount } from "../testUtils";

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
  calculateApiCost: jest.fn(() => 0.5),
  mapModelToCostModel: jest.fn(() => "claude-sonnet-test"),
}));

describe("Comprehensive Analysis Highlights to Highlights E2E", () => {
  const mockAgent: Agent = {
    id: "test-agent-1",
    name: "Test Agent",
    version: "1.0",
    description: "A test agent",
    primaryInstructions: "Test instructions",
    providesGrades: false,
  };

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
    const { anthropic } = require("../../../types/openai");
    
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
            selfCritique: "This analysis could be improved by considering additional perspectives and providing more specific evidence.",
            highlightInsights: [
              {
                id: "insight-1",
                title: "First Important Point",
                location: adjustedRefs[0], // Dynamically calculated
                observation: "This is the first observation",
                significance: "This matters because...",
                suggestedHighlight: "Highlight 1 text"
              },
              {
                id: "insight-2", 
                title: "Second Key Finding",
                location: adjustedRefs[1], // Dynamically calculated
                observation: "This spans multiple lines",
                significance: "Important for understanding",
                suggestedHighlight: "Highlight 2 text"
              },
              {
                id: "insight-3",
                title: "Third Observation",
                location: adjustedRefs[2], // Dynamically calculated
                observation: "Found on line 3",
                significance: "Critical insight",
                suggestedHighlight: "Highlight 3 text"
              },
              {
                id: "insight-4",
                title: "Fourth Note",
                location: adjustedRefs[3], // Dynamically calculated
                observation: "Filler analysis",
                significance: "Shows pattern",
                suggestedHighlight: "Highlight 4 text"
              },
              {
                id: "insight-5",
                title: "Final Point",
                location: adjustedRefs[4], // Dynamically calculated
                observation: "Concluding observation",
                significance: "Wraps up the analysis",
                suggestedHighlight: "Highlight 5 text"
              }
            ]
          }
        }
      ],
      usage: { input_tokens: 100, output_tokens: 200 }
    };

    anthropic.messages.create.mockResolvedValueOnce(mockAnalysisResponse);

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
    const { anthropic } = require("../../../types/openai");
    
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
            selfCritique: "This analysis has limitations and could benefit from more thorough investigation.",
            highlightInsights: [
              {
                id: "insight-1",
                title: "Off by One Error",
                location: wrongRefs[0], // Dynamically calculated wrong line
                observation: "Looking for content from line 1",
                significance: "Testing fuzzy line matching",
                suggestedHighlight: "Should find 'line 1' text"
              },
              {
                id: "insight-2",
                title: "Case Mismatch",
                location: wrongRefs[1], // Dynamically calculated
                observation: "Testing case sensitivity",
                significance: "Should match despite case",
                suggestedHighlight: "Should find 'IMPORTANT' as 'important'"
              }
            ]
          }
        }
      ],
      usage: { input_tokens: 100, output_tokens: 200 }
    };

    anthropic.messages.create.mockResolvedValueOnce(mockAnalysisResponse);

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
    const { anthropic } = require("../../../types/openai");
    
    // Mock response with some invalid highlights
    const mockAnalysisResponse = {
      content: [
        {
          type: "tool_use",
          name: "provide_comprehensive_analysis",
          input: {
            summary: "Test summary",
            analysis: "Test analysis",
            selfCritique: "This analysis has limitations and could benefit from more thorough investigation.",
            highlightInsights: [
              {
                id: "insight-1",
                title: "Valid Highlight",
                location: "Line 1",
                observation: "This should work",
                significance: "Valid",
                suggestedHighlight: "Good highlight"
              },
              {
                id: "insight-2",
                title: "Invalid Line Number",
                location: "Line 999", // Way out of bounds
                observation: "This line doesn't exist",
                significance: "Will fail",
                suggestedHighlight: "Bad highlight"
              },
              {
                id: "insight-3",
                title: "Another Valid",
                location: "Line 3",
                observation: "This should also work",
                significance: "Valid",
                suggestedHighlight: "Another good highlight"
              }
            ]
          }
        }
      ],
      usage: { input_tokens: 100, output_tokens: 200 }
    };

    anthropic.messages.create.mockResolvedValueOnce(mockAnalysisResponse);

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