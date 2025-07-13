import { analyzeChunk } from "../analyzeChunk";
import { convertHighlightsToComments } from "../highlightConverter";
import { spellingGrammarTestCases } from "../testCases";
import type { SpellingGrammarHighlight } from "../types";

// Mock the anthropic module
jest.mock("../../../../types/openai", () => ({
  anthropic: {
    messages: {
      create: jest.fn(),
    },
  },
  ANALYSIS_MODEL: "claude-3-opus-20240229",
  DEFAULT_TEMPERATURE: 0.3,
}));

import { anthropic } from "../../../../types/openai";

describe("Comprehensive Unit Tests with Test Cases", () => {
  const mockAnthropicCreate = anthropic.messages.create as jest.MockedFunction<
    typeof anthropic.messages.create
  >;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Test each case with mocked perfect responses
  test.each(spellingGrammarTestCases.slice(0, 5))( // Just test first 5 for unit tests
    "$id: $description (mocked)",
    async (testCase) => {
      // Mock perfect response matching expected errors
      const mockErrors: SpellingGrammarHighlight[] = testCase.expectedErrors.map(err => ({
        lineStart: err.lineStart,
        lineEnd: err.lineEnd,
        highlightedText: err.highlightedText,
        description: `${err.errorType.charAt(0).toUpperCase() + err.errorType.slice(1)} error: '${err.highlightedText}' should be '${err.expectedFix}'`
      }));

      mockAnthropicCreate.mockResolvedValueOnce({
        content: [
          {
            type: "tool_use",
            name: "report_errors",
            input: {
              errors: mockErrors
            },
          },
        ],
      } as any);

      const highlights = await analyzeChunk(testCase.chunk, {
        agentName: "Unit Test",
        primaryInstructions: "Find errors"
      });

      // Should return exactly what we mocked
      expect(highlights).toHaveLength(mockErrors.length);
      
      // Verify each highlight matches (but the analyzeChunk returns absolute line numbers)
      highlights.forEach((highlight, index) => {
        expect(highlight.lineStart).toBe(testCase.expectedErrors[index].lineStart);
        expect(highlight.lineEnd).toBe(testCase.expectedErrors[index].lineEnd);
        expect(highlight.highlightedText).toBe(mockErrors[index].highlightedText);
        expect(highlight.description).toBe(mockErrors[index].description);
      });

      // Test conversion to comments
      // Need to convert absolute line numbers back to relative for the converter
      const relativeHighlights = highlights.map(h => ({
        ...h,
        lineStart: h.lineStart - testCase.chunk.startLineNumber + 1,
        lineEnd: h.lineEnd - testCase.chunk.startLineNumber + 1
      }));
      
      const comments = convertHighlightsToComments(
        relativeHighlights,
        testCase.chunk.content,
        0
      );

      expect(comments).toHaveLength(highlights.length);
      comments.forEach(comment => {
        expect(comment.isValid).toBe(true);
        expect(comment.highlight.isValid).toBe(true);
      });
    }
  );

  // Test filtering of invalid responses
  test("filters out invalid line numbers from LLM response", async () => {
    const testCase = spellingGrammarTestCases[0];
    
    mockAnthropicCreate.mockResolvedValueOnce({
      content: [
        {
          type: "tool_use",
          name: "report_errors",
          input: {
            errors: [
              {
                lineStart: testCase.chunk.startLineNumber,
                lineEnd: testCase.chunk.startLineNumber,
                highlightedText: "valid",
                description: "Valid error"
              },
              {
                lineStart: 99999, // Way out of range
                lineEnd: 99999,
                highlightedText: "invalid",
                description: "This should be filtered"
              }
            ]
          },
        },
      ],
    } as any);

    const highlights = await analyzeChunk(testCase.chunk, {
      agentName: "Filter Test",
      primaryInstructions: "Test filtering"
    });

    expect(highlights).toHaveLength(1);
    expect(highlights[0].highlightedText).toBe("valid");
  });

  // Test empty chunk handling
  test("handles empty chunks without calling LLM", async () => {
    const emptyChunk = {
      content: "",
      startLineNumber: 1,
      lines: [""]
    };

    const highlights = await analyzeChunk(emptyChunk, {
      agentName: "Empty Test",
      primaryInstructions: "Test empty"
    });

    expect(highlights).toEqual([]);
    expect(mockAnthropicCreate).not.toHaveBeenCalled();
  });

  // Test highlight offset calculation
  test("calculates correct offsets for various line numbers", () => {
    const testCases = [
      { startLine: 1, content: "Error here", expectedOffset: 0 },
      { startLine: 100, content: "Error here", expectedOffset: 0 },
      { startLine: 9999, content: "Error here", expectedOffset: 0 },
    ];

    testCases.forEach(({ startLine, content, expectedOffset }) => {
      const highlights: SpellingGrammarHighlight[] = [{
        lineStart: startLine,
        lineEnd: startLine,
        highlightedText: "Error",
        description: "Test error"
      }];

      // For convertHighlightsToComments, line numbers should be relative to content (1-based)
      const relativeHighlights = highlights.map(h => ({
        ...h,
        lineStart: 1,  // Always line 1 for these single-line test cases
        lineEnd: 1
      }));
      
      const comments = convertHighlightsToComments(relativeHighlights, content, 0);
      
      expect(comments).toHaveLength(1);
      expect(comments[0].highlight.startOffset).toBe(expectedOffset);
      expect(comments[0].highlight.quotedText).toBe("Error");
    });
  });
});

// Performance test
describe("Performance Tests", () => {
  const mockAnthropicCreate = anthropic.messages.create as jest.MockedFunction<
    typeof anthropic.messages.create
  >;

  test("handles large chunks efficiently", async () => {
    const largeChunk = {
      content: Array(100).fill("This is a line with no errors.").join("\n"),
      startLineNumber: 1,
      lines: Array(100).fill("This is a line with no errors.")
    };

    mockAnthropicCreate.mockResolvedValueOnce({
      content: [
        {
          type: "tool_use",
          name: "report_errors",
          input: { errors: [] },
        },
      ],
    } as any);

    const startTime = Date.now();
    const highlights = await analyzeChunk(largeChunk, {
      agentName: "Performance Test",
      primaryInstructions: "Test performance"
    });
    const endTime = Date.now();

    expect(highlights).toEqual([]);
    expect(endTime - startTime).toBeLessThan(1000); // Should complete in under 1 second
  });
});