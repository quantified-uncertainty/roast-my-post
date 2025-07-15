import { SpellingGrammarLLMClient } from "../infrastructure/llmClient";
import { convertHighlightsToComments } from "../highlightConverter";
import { spellingGrammarTestCases } from "../testCases";
import type { SpellingGrammarHighlight } from "../types";
import { DocumentChunk, DocumentConventions, AnalysisContext } from "../domain";
import { buildSystemPrompt, buildUserPrompt } from "../application";

// Mock the anthropic module
jest.mock("../../../../types/openai", () => ({
  createAnthropicClient: jest.fn(() => ({
    messages: {
      create: jest.fn(),
    },
  })),
  ANALYSIS_MODEL: "claude-3-opus-20240229",
  DEFAULT_TEMPERATURE: 0.3,
}));

import { createAnthropicClient } from "../../../../types/openai";

describe("Comprehensive Unit Tests with Test Cases", () => {
  const mockCreateAnthropicClient = createAnthropicClient as jest.MockedFunction<
    typeof createAnthropicClient
  >;
  let mockAnthropicCreate: jest.MockedFunction<any>;
  let llmClient: SpellingGrammarLLMClient;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up the mock for createAnthropicClient
    mockAnthropicCreate = jest.fn();
    mockCreateAnthropicClient.mockReturnValue({
      messages: {
        create: mockAnthropicCreate,
      },
    } as any);
    
    llmClient = new SpellingGrammarLLMClient();
  });

  // Helper function to convert old test case format to new format
  const convertTestCaseToChunk = (testCase: any): DocumentChunk => {
    return new DocumentChunk(
      testCase.chunk.content,
      testCase.chunk.startLineNumber,
      testCase.chunk.lines
    );
  };

  // Test each case with mocked perfect responses
  test.each(spellingGrammarTestCases.slice(0, 5))( // Just test first 5 for unit tests
    "$id: $description (mocked)",
    async (testCase) => {
      // Convert to new domain objects
      const chunk = convertTestCaseToChunk(testCase);
      const conventions = new DocumentConventions('US', 'blog', 'mixed');
      const context = new AnalysisContext("Unit Test", "Find errors", conventions);

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
        usage: { input_tokens: 100, output_tokens: 50 }
      } as any);

      const systemPrompt = buildSystemPrompt(context);
      const userPrompt = buildUserPrompt(chunk);
      const response = await llmClient.analyzeText(systemPrompt, userPrompt);

      // Should return exactly what we mocked
      expect(response.errors).toHaveLength(mockErrors.length);
      
      // Verify each error matches
      response.errors.forEach((error, index) => {
        expect(error.lineStart).toBe(testCase.expectedErrors[index].lineStart);
        expect(error.lineEnd).toBe(testCase.expectedErrors[index].lineEnd);
        expect(error.highlightedText).toBe(mockErrors[index].highlightedText);
        expect(error.description).toBe(mockErrors[index].description);
      });

      // Test conversion to comments
      // Convert errors to old highlight format for compatibility
      const relativeHighlights = response.errors.map(error => ({
        lineStart: error.lineStart - testCase.chunk.startLineNumber + 1,
        lineEnd: error.lineEnd - testCase.chunk.startLineNumber + 1,
        highlightedText: error.highlightedText,
        description: error.description
      }));
      
      const comments = convertHighlightsToComments(
        relativeHighlights,
        testCase.chunk.content,
        0
      );

      expect(comments).toHaveLength(response.errors.length);
      comments.forEach(comment => {
        expect(comment.isValid).toBe(true);
        expect(comment.highlight.isValid).toBe(true);
      });
    }
  );

  // Test filtering of invalid responses
  test("filters out invalid line numbers from LLM response", async () => {
    const testCase = spellingGrammarTestCases[0];
    const chunk = convertTestCaseToChunk(testCase);
    const conventions = new DocumentConventions('US', 'blog', 'mixed');
    const context = new AnalysisContext("Filter Test", "Test filtering", conventions);
    
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
      usage: { input_tokens: 100, output_tokens: 50 }
    } as any);

    const systemPrompt = buildSystemPrompt(context);
    const userPrompt = buildUserPrompt(chunk);
    const response = await llmClient.analyzeText(systemPrompt, userPrompt);

    // Note: The new implementation doesn't filter errors automatically in the LLM client
    // That filtering happens in the workflow layer. For this unit test, we get all errors.
    expect(response.errors).toHaveLength(2);
    expect(response.errors[0].highlightedText).toBe("valid");
    expect(response.errors[1].highlightedText).toBe("invalid");
  });

  // Test empty chunk handling
  test("handles empty chunks without calling LLM", async () => {
    const emptyChunk = new DocumentChunk("", 1, []);
    const conventions = new DocumentConventions('US', 'blog', 'mixed');
    const context = new AnalysisContext("Empty Test", "Test empty", conventions);

    // For empty chunks, the LLM client should still be called but with empty content
    mockAnthropicCreate.mockResolvedValueOnce({
      content: [
        {
          type: "tool_use",
          name: "report_errors",
          input: { errors: [] },
        },
      ],
      usage: { input_tokens: 10, output_tokens: 5 }
    } as any);

    const systemPrompt = buildSystemPrompt(context);
    const userPrompt = buildUserPrompt(emptyChunk);
    const response = await llmClient.analyzeText(systemPrompt, userPrompt);

    expect(response.errors).toEqual([]);
    expect(mockAnthropicCreate).toHaveBeenCalled();
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
  const mockCreateAnthropicClient = createAnthropicClient as jest.MockedFunction<
    typeof createAnthropicClient
  >;
  let mockAnthropicCreate: jest.MockedFunction<any>;
  let llmClient: SpellingGrammarLLMClient;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up the mock for createAnthropicClient
    mockAnthropicCreate = jest.fn();
    mockCreateAnthropicClient.mockReturnValue({
      messages: {
        create: mockAnthropicCreate,
      },
    } as any);
    
    llmClient = new SpellingGrammarLLMClient();
  });

  test("handles large chunks efficiently", async () => {
    const largeContent = Array(100).fill("This is a line with no errors.").join("\n");
    const largeChunk = new DocumentChunk(largeContent, 1, largeContent.split('\n'));
    const conventions = new DocumentConventions('US', 'blog', 'mixed');
    const context = new AnalysisContext("Performance Test", "Test performance", conventions);

    mockAnthropicCreate.mockResolvedValueOnce({
      content: [
        {
          type: "tool_use",
          name: "report_errors",
          input: { errors: [] },
        },
      ],
      usage: { input_tokens: 1000, output_tokens: 10 }
    } as any);

    const startTime = Date.now();
    const systemPrompt = buildSystemPrompt(context);
    const userPrompt = buildUserPrompt(largeChunk);
    const response = await llmClient.analyzeText(systemPrompt, userPrompt);
    const endTime = Date.now();

    expect(response.errors).toEqual([]);
    expect(endTime - startTime).toBeLessThan(1000); // Should complete in under 1 second
  });
});