import { analyzeSpellingGrammar } from "../index";
import type { Document } from "../../../../types/documents";
import type { Agent } from "../../../../types/agentSchema";

// Mock the LLM client
jest.mock("../infrastructure/llmClient");
import { SpellingGrammarLLMClient } from "../infrastructure/llmClient";

// Mock the convertHighlightsToComments function
jest.mock("../highlightConverter");
import { convertHighlightsToComments } from "../highlightConverter";

// Mock the detectDocumentConventions function
jest.mock("../detectConventions");
import { detectDocumentConventions } from "../detectConventions";

const mockLLMClient = SpellingGrammarLLMClient as jest.MockedClass<typeof SpellingGrammarLLMClient>;
const mockConvertHighlights = convertHighlightsToComments as jest.MockedFunction<typeof convertHighlightsToComments>;
const mockDetectConventions = detectDocumentConventions as jest.MockedFunction<typeof detectDocumentConventions>;

describe("analyzeSpellingGrammar", () => {
  const mockDocument: Document = {
    id: "test-doc",
    slug: "test-document",
    title: "Test Document",
    author: "Test Author",
    content: `This is a test document with some spelling and grammer errors.
I will recieve the package tommorow.
The team are working hard on the project.
Its a beautiful day outside.`,
    publishedDate: new Date().toISOString(),
    url: "https://example.com/test",
    platforms: ["test"],
    reviews: [],
    intendedAgents: []
  };

  const mockAgent: Agent = {
    id: "test-agent",
    name: "Grammar Checker",
    version: "v1",
    primaryInstructions: "Find spelling and grammar errors",
    description: "Checks for spelling and grammar",
    providesGrades: true,
    extendedCapabilityId: "spelling-grammar"
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementation for detectDocumentConventions
    mockDetectConventions.mockResolvedValue({
      conventions: {
        language: 'US',
        documentType: 'casual',
        formality: 'informal',
        examples: []
      },
      usage: {
        input_tokens: 100,
        output_tokens: 50
      }
    });
    
    // Default mock implementation for convertHighlightsToComments
    // The actual implementation calls this for each highlight individually
    mockConvertHighlights.mockImplementation((highlights, content, baseOffset) => 
      highlights.map((highlight, index) => ({
        id: `comment-${Date.now()}-${index}`,
        description: highlight.description,
        importance: 7,
        grade: 20,
        highlight: {
          startOffset: (baseOffset || 0) + index * 10,
          endOffset: (baseOffset || 0) + index * 10 + highlight.highlightedText.length,
          quotedText: highlight.highlightedText,
          isValid: true
        },
        isValid: true
      }))
    );
  });

  test("splits document into chunks and aggregates results", async () => {
    // Mock LLM client to return different errors for each chunk
    const mockAnalyzeText = mockLLMClient.prototype.analyzeText as jest.MockedFunction<any>;
    mockAnalyzeText.mockResolvedValueOnce({
      errors: [
        {
          lineStart: 1,
          lineEnd: 1,
          highlightedText: "grammer",
          description: "Spelling error: should be 'grammar'",
          errorType: "spelling",
          severity: "high"
        },
        {
          lineStart: 2,
          lineEnd: 2,
          highlightedText: "recieve",
          description: "Spelling error: should be 'receive'",
          errorType: "spelling",
          severity: "high"
        },
        {
          lineStart: 2,
          lineEnd: 2,
          highlightedText: "tommorow",
          description: "Spelling error: should be 'tomorrow'",
          errorType: "spelling",
          severity: "high"
        },
        {
          lineStart: 3,
          lineEnd: 3,
          highlightedText: "are",
          description: "Subject-verb disagreement: 'team' is singular, use 'is'",
          errorType: "grammar",
          severity: "high"
        },
        {
          lineStart: 4,
          lineEnd: 4,
          highlightedText: "Its",
          description: "Missing apostrophe: should be 'It's'",
          errorType: "punctuation",
          severity: "medium"
        }
      ],
      usage: {
        input_tokens: 500,
        output_tokens: 100
      }
    });

    const result = await analyzeSpellingGrammar(
      mockDocument,
      mockAgent,
      { targetHighlights: 10 }
    );

    // Should have called analyzeText once for this small document
    expect(mockAnalyzeText).toHaveBeenCalledTimes(1);

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
    expect(result.analysis).toContain("Unique Errors Found:** 5");
    
    // Check summary
    expect(result.summary).toContain("Found 5 unique error");

    // Check tasks (convention detection + 1 chunk + post-processing)
    expect(result.tasks).toHaveLength(3);
    expect(result.tasks[0].name).toBe("Detect document conventions");
    expect(result.tasks[1].name).toBe("Analyze chunk 1");
    expect(result.tasks[2].name).toBe("Post-process and deduplicate errors");
  });

  test("handles documents with no errors", async () => {
    const mockAnalyzeText = mockLLMClient.prototype.analyzeText as jest.MockedFunction<any>;
    mockAnalyzeText.mockClear();
    mockAnalyzeText.mockResolvedValue({ 
      errors: [],
      usage: {
        input_tokens: 100,
        output_tokens: 20
      }
    });

    const cleanDocument: Document = {
      ...mockDocument,
      content: "This is a perfectly written document with no errors."
    };

    const result = await analyzeSpellingGrammar(
      cleanDocument,
      mockAgent,
      { targetHighlights: 10 }
    );

    expect(result.highlights).toHaveLength(0);
    expect(result.summary).toBe("No spelling or grammar errors detected.");
    expect(result.analysis).toContain("Excellent!");
    expect(result.grade).toBeGreaterThanOrEqual(90);
  });

  test("respects targetHighlights limit", async () => {
    // Mock many errors
    const manyErrors = Array(10).fill(null).map((_, i) => ({
      lineStart: 1,
      lineEnd: 1,
      highlightedText: `error${i}`,
      description: `Error ${i}`,
      errorType: "spelling",
      severity: "medium"
    }));

    const mockAnalyzeText = mockLLMClient.prototype.analyzeText as jest.MockedFunction<any>;
    mockAnalyzeText.mockClear();
    mockAnalyzeText.mockResolvedValue({ 
      errors: manyErrors,
      usage: {
        input_tokens: 300,
        output_tokens: 150
      }
    });

    const result = await analyzeSpellingGrammar(
      mockDocument,
      mockAgent,
      { targetHighlights: 10 }
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

    const mockAnalyzeText = mockLLMClient.prototype.analyzeText as jest.MockedFunction<any>;
    mockAnalyzeText.mockResolvedValue({ 
      errors: [],
      usage: {
        input_tokens: 500,
        output_tokens: 50
      }
    });

    await analyzeSpellingGrammar(largeDocument, mockAgent, { targetHighlights: 10 });

    // Should have been called multiple times due to chunking
    expect(mockAnalyzeText.mock.calls.length).toBeGreaterThan(1);
    
    // Each call should have system and user prompts
    mockAnalyzeText.mock.calls.forEach((call: any) => {
      expect(call).toHaveLength(2); // systemPrompt, userPrompt
      expect(typeof call[0]).toBe('string'); // systemPrompt
      expect(typeof call[1]).toBe('string'); // userPrompt
    });
  });
});