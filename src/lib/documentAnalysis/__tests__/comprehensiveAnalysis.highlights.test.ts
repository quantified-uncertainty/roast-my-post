import { generateComprehensiveAnalysis } from "../comprehensiveAnalysis";
import { extractCommentsFromAnalysis } from "../commentExtraction";
import type { Agent } from "../../../types/agentSchema";
import type { Document } from "../../../types/documents";

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

describe("Comprehensive Analysis Highlights to Comments E2E", () => {
  const mockAgent: Agent = {
    id: "test-agent-1",
    name: "Test Agent",
    version: "1.0",
    purpose: "ASSESSOR",
    description: "A test agent",
    genericInstructions: "Test instructions",
  };

  const mockDocument: Document = {
    id: "test-doc-1",
    slug: "test-doc",
    title: "Test Document",
    content: `This is line 1 with some content.
Line 2 has different text here.
Line 3 contains important information.
Line 4 is just filler text.
Line 5 has the final content.`,
    author: "Test Author",
    publishedDate: "2024-01-01",
    reviews: [],
    intendedAgents: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("all highlights from comprehensive analysis should become comments", async () => {
    const { anthropic } = require("../../../types/openai");
    
    // Mock comprehensive analysis response with 5 highlights
    const mockAnalysisResponse = {
      content: [
        {
          type: "tool_use",
          name: "provide_comprehensive_analysis",
          input: {
            summary: "Test summary",
            analysis: "# Analysis\\n\\n## Overview\\nTest analysis content\\n\\n## Key Highlights\\n\\nHighlights listed below",
            commentInsights: [
              {
                id: "insight-1",
                title: "First Important Point",
                location: "Line 1",
                observation: "This is the first observation",
                significance: "This matters because...",
                suggestedComment: "Comment 1 text"
              },
              {
                id: "insight-2", 
                title: "Second Key Finding",
                location: "Lines 2-3",
                observation: "This spans multiple lines",
                significance: "Important for understanding",
                suggestedComment: "Comment 2 text"
              },
              {
                id: "insight-3",
                title: "Third Observation",
                location: "Line 3",
                observation: "Found on line 3",
                significance: "Critical insight",
                suggestedComment: "Comment 3 text"
              },
              {
                id: "insight-4",
                title: "Fourth Note",
                location: "Line 4", 
                observation: "Filler analysis",
                significance: "Shows pattern",
                suggestedComment: "Comment 4 text"
              },
              {
                id: "insight-5",
                title: "Final Point",
                location: "Line 5",
                observation: "Concluding observation",
                significance: "Wraps up the analysis",
                suggestedComment: "Comment 5 text"
              }
            ]
          }
        }
      ],
      usage: { input_tokens: 100, output_tokens: 200 }
    };

    anthropic.messages.create.mockResolvedValueOnce(mockAnalysisResponse);

    // Step 1: Generate comprehensive analysis with 5 target comments
    const analysisResult = await generateComprehensiveAnalysis(
      mockDocument,
      mockAgent,
      500,
      5 // Request 5 comments
    );

    // Verify we got 5 insights
    expect(analysisResult.outputs.commentInsights).toHaveLength(5);
    console.log(`Generated ${analysisResult.outputs.commentInsights.length} insights`);

    // Step 2: Extract comments from the analysis
    const commentResult = await extractCommentsFromAnalysis(
      mockDocument,
      mockAgent,
      analysisResult.outputs,
      5 // Target 5 comments
    );

    // Verify all 5 insights became comments
    expect(commentResult.outputs.comments).toHaveLength(5);
    console.log(`Extracted ${commentResult.outputs.comments.length} comments`);

    // Verify comment details
    commentResult.outputs.comments.forEach((comment, index) => {
      console.log(`Comment ${index + 1}: "${comment.title}"`);
      expect(comment.title).toBe(analysisResult.outputs.commentInsights[index].title);
      expect(comment.description).toBe(analysisResult.outputs.commentInsights[index].suggestedComment);
      expect(comment.highlight).toBeDefined();
      expect(comment.highlight.startOffset).toBeGreaterThanOrEqual(0);
      expect(comment.highlight.endOffset).toBeGreaterThan(comment.highlight.startOffset);
    });
  });

  test("handles line number mismatches with fuzzy matching", async () => {
    const { anthropic } = require("../../../types/openai");
    
    // Mock response with intentionally wrong line numbers
    const mockAnalysisResponse = {
      content: [
        {
          type: "tool_use",
          name: "provide_comprehensive_analysis",
          input: {
            summary: "Test summary",
            analysis: "Test analysis",
            commentInsights: [
              {
                id: "insight-1",
                title: "Off by One Error",
                location: "Line 2", // Actually line 1
                observation: "Looking for content from line 1",
                significance: "Testing fuzzy line matching",
                suggestedComment: "Should find 'line 1' text"
              },
              {
                id: "insight-2",
                title: "Case Mismatch",
                location: "Line 3",
                observation: "Testing case sensitivity",
                significance: "Should match despite case",
                suggestedComment: "Should find 'IMPORTANT' as 'important'"
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

    const commentResult = await extractCommentsFromAnalysis(
      mockDocument,
      mockAgent,
      analysisResult.outputs,
      2
    );

    // Should still get 2 comments despite line mismatches
    expect(commentResult.outputs.comments).toHaveLength(2);
  });

  test("skips invalid comments gracefully", async () => {
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
            commentInsights: [
              {
                id: "insight-1",
                title: "Valid Comment",
                location: "Line 1",
                observation: "This should work",
                significance: "Valid",
                suggestedComment: "Good comment"
              },
              {
                id: "insight-2",
                title: "Invalid Line Number",
                location: "Line 999", // Way out of bounds
                observation: "This line doesn't exist",
                significance: "Will fail",
                suggestedComment: "Bad comment"
              },
              {
                id: "insight-3",
                title: "Another Valid",
                location: "Line 3",
                observation: "This should also work",
                significance: "Valid",
                suggestedComment: "Another good comment"
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

    expect(analysisResult.outputs.commentInsights).toHaveLength(3);

    const commentResult = await extractCommentsFromAnalysis(
      mockDocument,
      mockAgent,
      analysisResult.outputs,
      3
    );

    // Should get 2 valid comments, skipping the invalid one
    expect(commentResult.outputs.comments).toHaveLength(2);
    expect(commentResult.outputs.comments[0].title).toBe("Valid Comment");
    expect(commentResult.outputs.comments[1].title).toBe("Another Valid");
  });
});