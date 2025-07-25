import { convertLLMResultToLocation, generateLLMSearchPrompts } from "../llmSearch";
import { LineBasedLocator } from "@/lib/text-location/line-based";

describe("llmSearch - convertLLMResultToLocation", () => {
  const sampleDocument = `The quick brown fox jumps over the lazy dog.
Machine learning has many applications. Machine learning paradigms include supervised learning.
This is the third line with some content.`;

  let locator: LineBasedLocator;

  beforeEach(() => {
    locator = new LineBasedLocator(sampleDocument);
  });

  describe("Basic functionality", () => {
    it("should convert valid LLM result to text location", () => {
      const llmResult = {
        found: true,
        startLineNumber: 2,
        endLineNumber: 2,
        startCharacters: "Machine lea",
        endCharacters: "paradigms",
        confidence: 1.0,
      };

      const result = convertLLMResultToLocation(
        llmResult,
        locator,
        "machine learning paradigms",
        sampleDocument
      );

      expect(result).toBeTruthy();
      expect(result?.quotedText).toBe("Machine learning paradigms");
      expect(result?.strategy).toBe("llm");
      expect(result?.confidence).toBe(0.9); // Scaled down from 1.0
    });

    it("should handle not found results", () => {
      const llmResult = {
        found: false,
        startLineNumber: 0,
        endLineNumber: 0,
        startCharacters: "",
        endCharacters: "",
        confidence: 0,
      };

      const result = convertLLMResultToLocation(
        llmResult,
        locator,
        "nonexistent text",
        sampleDocument
      );

      expect(result).toBeNull();
    });
  });

  describe("Edge cases", () => {
    it("should reject short queries with empty characters", () => {
      const llmResult = {
        found: true,
        startLineNumber: 1,
        endLineNumber: 1,
        startCharacters: "",
        endCharacters: "",
        confidence: 1.0,
      };

      const result = convertLLMResultToLocation(
        llmResult,
        locator,
        "?",
        sampleDocument
      );

      expect(result).toBeNull();
    });

    it("should reject invalid line numbers", () => {
      const llmResult = {
        found: true,
        startLineNumber: 10, // Beyond document lines
        endLineNumber: 10,
        startCharacters: "test",
        endCharacters: "test",
        confidence: 1.0,
      };

      const result = convertLLMResultToLocation(
        llmResult,
        locator,
        "test",
        sampleDocument
      );

      expect(result).toBeNull();
    });

    it("should reject when start characters cannot be found", () => {
      const llmResult = {
        found: true,
        startLineNumber: 1,
        endLineNumber: 1,
        startCharacters: "NOTFOUND",
        endCharacters: "fox",
        confidence: 1.0,
      };

      const result = convertLLMResultToLocation(
        llmResult,
        locator,
        "test",
        sampleDocument
      );

      expect(result).toBeNull();
    });
  });

  describe("Multi-line matches", () => {
    it("should handle matches spanning multiple lines", () => {
      const llmResult = {
        found: true,
        startLineNumber: 1,
        endLineNumber: 2,
        startCharacters: "lazy dog.",
        endCharacters: "Machine lea",
        confidence: 0.9,
      };

      const result = convertLLMResultToLocation(
        llmResult,
        locator,
        "lazy dog. Machine learning",
        sampleDocument
      );

      expect(result).toBeTruthy();
      expect(result?.quotedText).toContain("lazy dog.");
      expect(result?.quotedText).toContain("Machine lea");
    });
  });

  describe("Real-world scenarios", () => {
    it("should handle ambiguous matches correctly", () => {
      // Test the "machine learning paradigms" case where there are multiple occurrences
      const llmResult = {
        found: true,
        startLineNumber: 2,
        endLineNumber: 2,
        startCharacters: "Machine lea", // This appears twice in line 2
        endCharacters: "paradigms",
        confidence: 1.0,
      };

      const result = convertLLMResultToLocation(
        llmResult,
        locator,
        "Machine learning paradigms",
        sampleDocument
      );

      expect(result).toBeTruthy();
      expect(result?.quotedText).toBe("Machine learning paradigms");
      // Should find the second occurrence that includes "paradigms"
      expect(result?.startOffset).toBe(85); // Position of second "Machine learning"
    });

    it("should handle single character matches", () => {
      const singleCharDoc = "What? Yes! No...";
      const singleCharLocator = new LineBasedLocator(singleCharDoc);
      
      const llmResult = {
        found: true,
        startLineNumber: 1,
        endLineNumber: 1,
        startCharacters: "?",
        endCharacters: "?",
        confidence: 1.0,
      };

      const result = convertLLMResultToLocation(
        llmResult,
        singleCharLocator,
        "?",
        singleCharDoc
      );

      expect(result).toBeTruthy();
      expect(result?.quotedText).toBe("?");
      expect(result?.startOffset).toBe(4); // Position of first "?"
    });

    it("should handle partial word matches", () => {
      const llmResult = {
        found: true,
        startLineNumber: 1,
        endLineNumber: 1,
        startCharacters: "quick brow",
        endCharacters: "brown fox",
        confidence: 0.9,
      };

      const result = convertLLMResultToLocation(
        llmResult,
        locator,
        "quick brown fox",
        sampleDocument
      );

      expect(result).toBeTruthy();
      expect(result?.quotedText).toBe("quick brown fox");
    });
  });

  describe("Character validation", () => {
    it("should validate end characters on different lines", () => {
      const llmResult = {
        found: true,
        startLineNumber: 1,
        endLineNumber: 2,
        startCharacters: "The quick",
        endCharacters: "INVALID",
        confidence: 1.0,
      };

      const result = convertLLMResultToLocation(
        llmResult,
        locator,
        "test",
        sampleDocument
      );

      expect(result).toBeNull();
    });

    it("should skip end character validation for same line", () => {
      const llmResult = {
        found: true,
        startLineNumber: 1,
        endLineNumber: 1,
        startCharacters: "The quick",
        endCharacters: "fox", // Valid on line 1
        confidence: 1.0,
      };

      const result = convertLLMResultToLocation(
        llmResult,
        locator,
        "The quick brown fox",
        sampleDocument
      );

      expect(result).toBeTruthy();
      expect(result?.quotedText).toBe("The quick brown fox");
    });
  });
});

describe("llmSearch - generateLLMSearchPrompts", () => {
  it("should generate prompts without context", () => {
    const numberedLines = `Line 1: First line
Line 2: Second line`;
    
    const { systemPrompt, userPrompt } = generateLLMSearchPrompts(
      "search text",
      numberedLines
    );

    expect(systemPrompt).toContain("precise text locator");
    expect(userPrompt).toContain("search text");
    expect(userPrompt).toContain(numberedLines);
    expect(userPrompt).not.toContain("<context>");
  });

  it("should generate prompts with context", () => {
    const numberedLines = `Line 1: First line
Line 2: Second line`;
    
    const { systemPrompt, userPrompt } = generateLLMSearchPrompts(
      "search text",
      numberedLines,
      "This is the context"
    );

    expect(systemPrompt).toContain("precise text locator");
    expect(userPrompt).toContain("search text");
    expect(userPrompt).toContain(numberedLines);
    expect(userPrompt).toContain("<context>");
    expect(userPrompt).toContain("This is the context");
  });

  it("should include all critical examples in system prompt", () => {
    const { systemPrompt } = generateLLMSearchPrompts("test", "Line 1: test");

    // Check for key examples
    expect(systemPrompt).toContain("Search: \"IP\"");
    expect(systemPrompt).toContain("Search: \"?\"");
    expect(systemPrompt).toContain("Search: \"machine learning paradigms\"");
    expect(systemPrompt).toContain("MULTIPLE OCCURRENCES");
  });
});