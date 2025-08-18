import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';
import { generateComprehensiveAnalysis } from "../comprehensiveAnalysis";
import { extractHighlightsFromAnalysis } from "../highlightExtraction";
import { createTestDocument, getPrependLineCount } from "../testUtils";
import type { Agent } from "../../../types/agentSchema";

// Mock the claude wrapper
vi.mock("../../../claude/wrapper", () => ({
  callClaudeWithTool: vi.fn(),
  MODEL_CONFIG: {
    analysis: "claude-sonnet-test",
    routing: "claude-3-haiku-20240307"
  },
  createHeliconeHeaders: vi.fn(() => ({})),
  withTimeout: vi.fn((promise) => promise),
}));

// withTimeout is now mocked in the main mock above

import { callClaudeWithTool } from "../../../claude/wrapper";
import { setupClaudeToolMock } from "../../../claude/mockHelpers";

// Mock the cost calculator
vi.mock("../../../utils/costCalculator", () => ({
  calculateApiCost: vi.fn(() => 0.5),
  mapModelToCostModel: vi.fn(() => "claude-sonnet-test"),
}));

describe("markdownPrepend Edge Cases", () => {
  const mockAgent: Agent = {
    id: "test-agent-1",
    name: "Test Agent",
    version: "1.0",
    description: "A test agent",
    primaryInstructions: "Test instructions",
    providesGrades: false,
  };

  let mockCallClaudeWithTool: typeof callClaudeWithTool;
  let mockHelper: ReturnType<typeof setupClaudeToolMock>;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Set up the mock helper
    mockCallClaudeWithTool = callClaudeWithTool as any;
    mockHelper = setupClaudeToolMock(mockCallClaudeWithTool);
  });

  describe("Highlights spanning prepend/content boundary", () => {
    test("handles highlight that starts in prepend and ends in content", async () => {
      
      const documentContent = "This is the first line of actual content.\nMore content here.";
      const mockDocument = createTestDocument(documentContent, {
        title: "Boundary Test",
        author: "Test Author",
        includePrepend: true,
      });

      // Calculate where the boundary is
      const prependLineCount = getPrependLineCount(mockDocument);
      
      // Mock a highlight that spans from line 9 (in prepend) to line 11 (in content)
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
                  location: `Lines ${prependLineCount - 1}-${prependLineCount + 1}`, // Spans boundary
                  suggestedHighlight: "This is the first line of actual content."
                }
              ]
            }
          }
        ],
        usage: { input_tokens: 100, output_tokens: 200 }
      };

      mockHelper.mockToolResponse(mockAnalysisResponse.content[0].input);

      const analysisResult = await generateComprehensiveAnalysis(
        mockDocument,
        mockAgent,
        500,
        1
      );

      const commentResult = await extractHighlightsFromAnalysis(
        mockDocument,
        mockAgent,
        analysisResult.outputs,
        1
      );

      // Should get the comment even though it spans the boundary
      expect(commentResult.outputs.highlights).toHaveLength(1);
      
      const comment = commentResult.outputs.highlights[0];
      expect(comment.highlight!.isValid).toBe(true);
      
      // The highlight should include content from both prepend and main content
      expect(comment.highlight!.quotedText.length).toBeGreaterThan(0);
    });

    test("handles highlight at exact boundary position", async () => {
      
      const documentContent = "First content line here.";
      const mockDocument = createTestDocument(documentContent, {
        title: "Exact Boundary",
        includePrepend: true,
      });

      const prependLineCount = getPrependLineCount(mockDocument);
      
      // Mock a highlight exactly at the boundary (first line of content)
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
                  location: `Line ${prependLineCount + 1}`, // First line of content
                  suggestedHighlight: "First content line here."
                }
              ]
            }
          }
        ],
        usage: { input_tokens: 100, output_tokens: 200 }
      };

      mockHelper.mockToolResponse(mockAnalysisResponse.content[0].input);

      const analysisResult = await generateComprehensiveAnalysis(
        mockDocument,
        mockAgent,
        500,
        1
      );

      const commentResult = await extractHighlightsFromAnalysis(
        mockDocument,
        mockAgent,
        analysisResult.outputs,
        1
      );

      expect(commentResult.outputs.highlights).toHaveLength(1);
      
      const comment = commentResult.outputs.highlights[0];
      expect(comment.highlight!.quotedText).toContain("First content line");
    });
  });

  describe("Empty and malformed prepend handling", () => {
    test("handles document with empty prepend gracefully", async () => {
      
      // Create document that explicitly has empty prepend
      const mockDocument = {
        ...createTestDocument("Content here", { includePrepend: false }),
        versions: [{
          markdownPrepend: "" // Empty string prepend
        }]
      };

      const mockAnalysisResponse = {
        content: [
          {
            type: "tool_use",
            name: "provide_comprehensive_analysis",
            input: {
              summary: "Test",
              analysis: "Test",
              highlightInsights: []
            }
          }
        ],
        usage: { input_tokens: 100, output_tokens: 200 }
      };

      mockHelper.mockToolResponse(mockAnalysisResponse.content[0].input);

      // Should not throw
      await expect(
        generateComprehensiveAnalysis(mockDocument, mockAgent, 500, 0)
      ).resolves.toBeTruthy();
    });

    test("handles malformed prepend with missing newlines", async () => {
      const malformedPrepend = "# Title**Author:** Test**Publication:** Test---"; // No newlines
      
      const mockDocument = {
        ...createTestDocument("Content", { includePrepend: false }),
        versions: [{
          markdownPrepend: malformedPrepend
        }]
      };

      // The system should handle this gracefully
      
      const mockAnalysisResponse = {
        content: [
          {
            type: "tool_use",
            name: "provide_comprehensive_analysis",
            input: {
              summary: "Test",
              analysis: "Test",
              highlightInsights: []
            }
          }
        ],
        usage: { input_tokens: 100, output_tokens: 200 }
      };

      mockHelper.mockToolResponse(mockAnalysisResponse.content[0].input);

      await expect(
        generateComprehensiveAnalysis(mockDocument, mockAgent, 500, 0)
      ).resolves.toBeTruthy();
    });
  });

  describe("Line number edge cases", () => {
    test("handles single line document", async () => {
      
      const singleLineDoc = createTestDocument("Single line only", {
        includePrepend: true
      });

      const prependLineCount = getPrependLineCount(singleLineDoc);
      
      const mockAnalysisResponse = {
        content: [
          {
            type: "tool_use",
            name: "provide_comprehensive_analysis",
            input: {
              summary: "Test",
              analysis: "Test",
              highlightInsights: [
                {
                  id: "insight-1",
                  location: `Line ${prependLineCount + 1}`,
                  suggestedHighlight: "Single line only"
                }
              ]
            }
          }
        ],
        usage: { input_tokens: 100, output_tokens: 200 }
      };

      mockHelper.mockToolResponse(mockAnalysisResponse.content[0].input);

      const analysisResult = await generateComprehensiveAnalysis(
        singleLineDoc,
        mockAgent,
        500,
        1
      );

      const commentResult = await extractHighlightsFromAnalysis(
        singleLineDoc,
        mockAgent,
        analysisResult.outputs,
        1
      );

      expect(commentResult.outputs.highlights).toHaveLength(1);
    });

    test("handles out of bounds line references", async () => {
      
      const mockDocument = createTestDocument("Line 1\nLine 2", {
        includePrepend: true
      });

      const mockAnalysisResponse = {
        content: [
          {
            type: "tool_use",
            name: "provide_comprehensive_analysis",
            input: {
              summary: "Test",
              analysis: "Test",
              highlightInsights: [
                {
                  id: "insight-1",
                  location: "Line 9999", // Way out of bounds
                  suggestedHighlight: "Should be skipped"
                }
              ]
            }
          }
        ],
        usage: { input_tokens: 100, output_tokens: 200 }
      };

      mockHelper.mockToolResponse(mockAnalysisResponse.content[0].input);

      const analysisResult = await generateComprehensiveAnalysis(
        mockDocument,
        mockAgent,
        500,
        1
      );

      const commentResult = await extractHighlightsFromAnalysis(
        mockDocument,
        mockAgent,
        analysisResult.outputs,
        1
      );

      // Should skip the invalid comment
      expect(commentResult.outputs.highlights).toHaveLength(0);
    });
  });

  describe("Special characters in prepend", () => {
    test("handles markdown special characters in title", async () => {
      
      const specialDoc = createTestDocument("Content", {
        title: "**Bold** and _italic_ and [link](url)",
        author: "Author `with` code",
        includePrepend: true
      });

      const mockAnalysisResponse = {
        content: [
          {
            type: "tool_use",
            name: "provide_comprehensive_analysis",
            input: {
              summary: "Test",
              analysis: "Test",
              highlightInsights: []
            }
          }
        ],
        usage: { input_tokens: 100, output_tokens: 200 }
      };

      mockHelper.mockToolResponse(mockAnalysisResponse.content[0].input);

      // Should handle special characters without breaking
      await expect(
        generateComprehensiveAnalysis(specialDoc, mockAgent, 500, 0)
      ).resolves.toBeTruthy();
    });

    test("handles unicode and emojis in prepend", async () => {
      
      const unicodeDoc = createTestDocument("Content", {
        title: "Test 测试 🚀 Document",
        author: "Author 作者 ✨",
        platforms: ["平台 🌟"],
        includePrepend: true
      });

      const prependLineCount = getPrependLineCount(unicodeDoc);
      
      const mockAnalysisResponse = {
        content: [
          {
            type: "tool_use",
            name: "provide_comprehensive_analysis",
            input: {
              summary: "Test",
              analysis: "Test",
              highlightInsights: [
                {
                  id: "insight-1",
                  location: `Line ${prependLineCount + 1}`,
                  suggestedHighlight: "Content"
                }
              ]
            }
          }
        ],
        usage: { input_tokens: 100, output_tokens: 200 }
      };

      mockHelper.mockToolResponse(mockAnalysisResponse.content[0].input);

      const analysisResult = await generateComprehensiveAnalysis(
        unicodeDoc,
        mockAgent,
        500,
        1
      );

      const commentResult = await extractHighlightsFromAnalysis(
        unicodeDoc,
        mockAgent,
        analysisResult.outputs,
        1
      );

      expect(commentResult.outputs.highlights).toHaveLength(1);
    });
  });

  describe("Performance with large prepends", () => {
    test("handles very large prepend efficiently", async () => {
      
      // Create a document with a very large title
      const largeDoc = createTestDocument("Content", {
        title: "A".repeat(500),
        author: "B".repeat(200),
        platforms: Array(20).fill("Platform"),
        includePrepend: true
      });

      const mockAnalysisResponse = {
        content: [
          {
            type: "tool_use",
            name: "provide_comprehensive_analysis",
            input: {
              summary: "Test",
              analysis: "Test",
              highlightInsights: []
            }
          }
        ],
        usage: { input_tokens: 100, output_tokens: 200 }
      };

      mockHelper.mockToolResponse(mockAnalysisResponse.content[0].input);

      const startTime = Date.now();
      
      await generateComprehensiveAnalysis(largeDoc, mockAgent, 500, 0);
      
      const duration = Date.now() - startTime;
      
      // Should complete reasonably fast even with large prepend
      expect(duration).toBeLessThan(1000); // Less than 1 second
    });
  });
});