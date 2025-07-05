import { generateComprehensiveAnalysis } from "../comprehensiveAnalysis";
import { extractCommentsFromAnalysis } from "../commentExtraction";
import { createTestDocument, getPrependLineCount } from "../testUtils";
import type { Agent } from "../../../types/agentSchema";

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
  COMMENT_EXTRACTION_TIMEOUT: 30000,
}));

// Mock the cost calculator
jest.mock("../../../utils/costCalculator", () => ({
  calculateApiCost: jest.fn(() => 0.5),
  mapModelToCostModel: jest.fn(() => "claude-sonnet-test"),
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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Highlights spanning prepend/content boundary", () => {
    test("handles highlight that starts in prepend and ends in content", async () => {
      const { anthropic } = require("../../../types/openai");
      
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
              selfCritique: "Test critique",
              commentInsights: [
                {
                  id: "insight-1",
                  title: "Boundary Spanning Comment",
                  location: `Lines ${prependLineCount - 1}-${prependLineCount + 1}`, // Spans boundary
                  observation: "This spans the prepend boundary",
                  significance: "Tests edge case",
                  suggestedComment: "Comment spanning boundary"
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
        1
      );

      const commentResult = await extractCommentsFromAnalysis(
        mockDocument,
        mockAgent,
        analysisResult.outputs,
        1
      );

      // Should get the comment even though it spans the boundary
      expect(commentResult.outputs.comments).toHaveLength(1);
      
      const comment = commentResult.outputs.comments[0];
      expect(comment.highlight.isValid).toBe(true);
      
      // The highlight should include content from both prepend and main content
      expect(comment.highlight.quotedText.length).toBeGreaterThan(0);
    });

    test("handles highlight at exact boundary position", async () => {
      const { anthropic } = require("../../../types/openai");
      
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
              selfCritique: "Test critique",
              commentInsights: [
                {
                  id: "insight-1",
                  title: "Exact Boundary Comment",
                  location: `Line ${prependLineCount + 1}`, // First line of content
                  observation: "At the boundary",
                  significance: "Boundary test",
                  suggestedComment: "Boundary comment"
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
        1
      );

      const commentResult = await extractCommentsFromAnalysis(
        mockDocument,
        mockAgent,
        analysisResult.outputs,
        1
      );

      expect(commentResult.outputs.comments).toHaveLength(1);
      
      const comment = commentResult.outputs.comments[0];
      expect(comment.highlight.quotedText).toContain("First content line");
    });
  });

  describe("Empty and malformed prepend handling", () => {
    test("handles document with empty prepend gracefully", async () => {
      const { anthropic } = require("../../../types/openai");
      
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
              selfCritique: "Test",
              commentInsights: []
            }
          }
        ],
        usage: { input_tokens: 100, output_tokens: 200 }
      };

      anthropic.messages.create.mockResolvedValueOnce(mockAnalysisResponse);

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
      const { anthropic } = require("../../../types/openai");
      
      const mockAnalysisResponse = {
        content: [
          {
            type: "tool_use",
            name: "provide_comprehensive_analysis",
            input: {
              summary: "Test",
              analysis: "Test",
              selfCritique: "Test",
              commentInsights: []
            }
          }
        ],
        usage: { input_tokens: 100, output_tokens: 200 }
      };

      anthropic.messages.create.mockResolvedValueOnce(mockAnalysisResponse);

      await expect(
        generateComprehensiveAnalysis(mockDocument, mockAgent, 500, 0)
      ).resolves.toBeTruthy();
    });
  });

  describe("Line number edge cases", () => {
    test("handles single line document", async () => {
      const { anthropic } = require("../../../types/openai");
      
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
              selfCritique: "Test",
              commentInsights: [
                {
                  id: "insight-1",
                  title: "Single Line",
                  location: `Line ${prependLineCount + 1}`,
                  observation: "Only line",
                  significance: "Test",
                  suggestedComment: "Comment"
                }
              ]
            }
          }
        ],
        usage: { input_tokens: 100, output_tokens: 200 }
      };

      anthropic.messages.create.mockResolvedValueOnce(mockAnalysisResponse);

      const analysisResult = await generateComprehensiveAnalysis(
        singleLineDoc,
        mockAgent,
        500,
        1
      );

      const commentResult = await extractCommentsFromAnalysis(
        singleLineDoc,
        mockAgent,
        analysisResult.outputs,
        1
      );

      expect(commentResult.outputs.comments).toHaveLength(1);
    });

    test("handles out of bounds line references", async () => {
      const { anthropic } = require("../../../types/openai");
      
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
              selfCritique: "Test",
              commentInsights: [
                {
                  id: "insight-1",
                  title: "Out of bounds",
                  location: "Line 9999", // Way out of bounds
                  observation: "Invalid line",
                  significance: "Test",
                  suggestedComment: "Should be skipped"
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
        1
      );

      const commentResult = await extractCommentsFromAnalysis(
        mockDocument,
        mockAgent,
        analysisResult.outputs,
        1
      );

      // Should skip the invalid comment
      expect(commentResult.outputs.comments).toHaveLength(0);
    });
  });

  describe("Special characters in prepend", () => {
    test("handles markdown special characters in title", async () => {
      const { anthropic } = require("../../../types/openai");
      
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
              selfCritique: "Test",
              commentInsights: []
            }
          }
        ],
        usage: { input_tokens: 100, output_tokens: 200 }
      };

      anthropic.messages.create.mockResolvedValueOnce(mockAnalysisResponse);

      // Should handle special characters without breaking
      await expect(
        generateComprehensiveAnalysis(specialDoc, mockAgent, 500, 0)
      ).resolves.toBeTruthy();
    });

    test("handles unicode and emojis in prepend", async () => {
      const { anthropic } = require("../../../types/openai");
      
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
              selfCritique: "Test",
              commentInsights: [
                {
                  id: "insight-1",
                  title: "Unicode test",
                  location: `Line ${prependLineCount + 1}`,
                  observation: "Content line",
                  significance: "Test",
                  suggestedComment: "Unicode handling"
                }
              ]
            }
          }
        ],
        usage: { input_tokens: 100, output_tokens: 200 }
      };

      anthropic.messages.create.mockResolvedValueOnce(mockAnalysisResponse);

      const analysisResult = await generateComprehensiveAnalysis(
        unicodeDoc,
        mockAgent,
        500,
        1
      );

      const commentResult = await extractCommentsFromAnalysis(
        unicodeDoc,
        mockAgent,
        analysisResult.outputs,
        1
      );

      expect(commentResult.outputs.comments).toHaveLength(1);
    });
  });

  describe("Performance with large prepends", () => {
    test("handles very large prepend efficiently", async () => {
      const { anthropic } = require("../../../types/openai");
      
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
              selfCritique: "Test",
              commentInsights: []
            }
          }
        ],
        usage: { input_tokens: 100, output_tokens: 200 }
      };

      anthropic.messages.create.mockResolvedValueOnce(mockAnalysisResponse);

      const startTime = Date.now();
      
      await generateComprehensiveAnalysis(largeDoc, mockAgent, 500, 0);
      
      const duration = Date.now() - startTime;
      
      // Should complete reasonably fast even with large prepend
      expect(duration).toBeLessThan(1000); // Less than 1 second
    });
  });
});