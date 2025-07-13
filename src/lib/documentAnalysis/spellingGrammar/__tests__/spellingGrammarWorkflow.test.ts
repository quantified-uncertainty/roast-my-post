import { analyzeSpellingGrammarDocument } from "../spellingGrammarWorkflow";
import type { Document } from "../../../../types/documents";
import type { Agent } from "../../../../types/agentSchema";

// Mock the analyzeChunk function
jest.mock("../analyzeChunk");
import { analyzeChunk } from "../analyzeChunk";

const mockAnalyzeChunk = analyzeChunk as jest.MockedFunction<typeof analyzeChunk>;

describe("analyzeSpellingGrammarDocument", () => {
  const mockDocument: Document = {
    id: "test-doc",
    title: "Test Document",
    author: "Test Author",
    content: `This is a test document with some spelling and grammer errors.
I will recieve the package tommorow.
The team are working hard on the project.
Its a beautiful day outside.`,
    importUrl: "https://example.com/test",
    platform: "test",
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockAgent: Agent = {
    id: "test-agent",
    name: "Grammar Checker",
    agentVersionId: "v1",
    primaryInstructions: "Find spelling and grammar errors",
    purpose: "ASSESSOR",
    description: "Checks for spelling and grammar",
    providesGrades: true,
    extendedCapabilityId: "spelling-grammar-"
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("splits document into chunks and aggregates results", async () => {
    // Mock analyzeChunk to return different errors for each chunk
    mockAnalyzeChunk
      .mockResolvedValueOnce([
        {
          lineStart: 1,
          lineEnd: 1,
          highlightedText: "grammer",
          description: "Spelling error: should be 'grammar'"
        }
      ])
      .mockResolvedValueOnce([
        {
          lineStart: 2,
          lineEnd: 2,
          highlightedText: "recieve",
          description: "Spelling error: should be 'receive'"
        },
        {
          lineStart: 2,
          lineEnd: 2,
          highlightedText: "tommorow",
          description: "Spelling error: should be 'tomorrow'"
        }
      ])
      .mockResolvedValueOnce([
        {
          lineStart: 3,
          lineEnd: 3,
          highlightedText: "are",
          description: "Subject-verb disagreement: 'team' is singular, use 'is'"
        }
      ])
      .mockResolvedValueOnce([
        {
          lineStart: 4,
          lineEnd: 4,
          highlightedText: "Its",
          description: "Missing apostrophe: should be 'It's'"
        }
      ]);

    const result = await analyzeSpellingGrammarDocument(
      mockDocument,
      mockAgent,
      10
    );

    // Should have called analyzeChunk 4 times (one per line/chunk in this case)
    expect(mockAnalyzeChunk).toHaveBeenCalledTimes(4);

    // Check the result structure
    expect(result).toHaveProperty("thinking", "");
    expect(result).toHaveProperty("analysis");
    expect(result).toHaveProperty("summary");
    expect(result).toHaveProperty("grade");
    expect(result).toHaveProperty("highlights");
    expect(result).toHaveProperty("tasks");

    // Should have 5 highlights total
    expect(result.highlights).toHaveLength(5);

    // Check that highlights are properly formatted
    result.highlights.forEach(highlight => {
      expect(highlight).toHaveProperty("description");
      expect(highlight).toHaveProperty("highlight");
      expect(highlight.highlight).toHaveProperty("startOffset");
      expect(highlight.highlight).toHaveProperty("endOffset");
      expect(highlight.highlight).toHaveProperty("quotedText");
      expect(highlight.highlight).toHaveProperty("isValid", true);
    });

    // Check analysis content
    expect(result.analysis).toContain("Spelling & Grammar Analysis");
    expect(result.analysis).toContain("Total Errors Found: 5");
    
    // Check summary
    expect(result.summary).toContain("Found 5 spelling/grammar errors");

    // Check tasks
    expect(result.tasks).toHaveLength(4); // One per chunk
    result.tasks.forEach((task, index) => {
      expect(task.taskName).toBe(`Analyze chunk ${index + 1}`);
      expect(task.status).toBe("success");
    });
  });

  test("handles documents with no errors", async () => {
    mockAnalyzeChunk.mockResolvedValue([]);

    const cleanDocument: Document = {
      ...mockDocument,
      content: "This is a perfectly written document with no errors."
    };

    const result = await analyzeSpellingGrammarDocument(
      cleanDocument,
      mockAgent,
      10
    );

    expect(result.highlights).toHaveLength(0);
    expect(result.summary).toBe("No spelling or grammar errors detected.");
    expect(result.analysis).toContain("No spelling or grammar errors were detected");
    expect(result.grade).toBeGreaterThanOrEqual(90);
  });

  test("respects targetHighlights limit", async () => {
    // Mock many errors
    const manyErrors = Array(30).fill(null).map((_, i) => ({
      lineStart: 1,
      lineEnd: 1,
      highlightedText: `error${i}`,
      description: `Error ${i}`
    }));

    mockAnalyzeChunk.mockResolvedValue(manyErrors);

    const result = await analyzeSpellingGrammarDocument(
      mockDocument,
      mockAgent,
      10 // Limit to 10 highlights
    );

    expect(result.highlights).toHaveLength(10);
  });

  test("handles large documents by splitting into chunks", async () => {
    // Create a large document that will be split into multiple chunks
    const largeContent = Array(200).fill(null).map((_, i) => 
      `Line ${i + 1}: This is a line with some content to make it longer.`
    ).join('\n');

    const largeDocument: Document = {
      ...mockDocument,
      content: largeContent
    };

    mockAnalyzeChunk.mockResolvedValue([]);

    await analyzeSpellingGrammarDocument(largeDocument, mockAgent, 10);

    // Should have been called multiple times due to chunking
    expect(mockAnalyzeChunk.mock.calls.length).toBeGreaterThan(1);
    
    // Check that chunks have proper line numbers
    const firstChunkCall = mockAnalyzeChunk.mock.calls[0][0];
    expect(firstChunkCall.startLineNumber).toBe(1);
    
    if (mockAnalyzeChunk.mock.calls.length > 1) {
      const secondChunkCall = mockAnalyzeChunk.mock.calls[1][0];
      expect(secondChunkCall.startLineNumber).toBeGreaterThan(1);
    }
  });
});