import { describe, expect, it } from "vitest";

// Vitest test file
import { LineBasedLocator } from "./index";

describe("LineBasedLocator", () => {
  describe("basic functionality", () => {
    it("should parse lines correctly", () => {
      const doc = "Line 1\nLine 2\nLine 3";
      const locator = new LineBasedLocator(doc);

      expect(locator.getNumberedLines()).toBe(
        "Line 1: Line 1\nLine 2: Line 2\nLine 3: Line 3"
      );
    });

    it("should convert offsets to line locations", () => {
      const doc = "Hello\nWorld\nTest";
      const locator = new LineBasedLocator(doc);

      // "World" starts at offset 6 and ends at 11
      const location = locator.offsetToLineLocation(6, 11);

      expect(location).toEqual({
        startLineIndex: 1,
        endLineIndex: 1,
        startCharacters: "World",
        endCharacters: "World",
      });
    });

    it("should handle multi-line selections", () => {
      const doc = "First line\nSecond line\nThird line";
      const locator = new LineBasedLocator(doc);

      // From "First" to "Second"
      const location = locator.offsetToLineLocation(0, 18);

      expect(location).toEqual({
        startLineIndex: 0,
        endLineIndex: 1,
        startCharacters: "First ",
        endCharacters: "econd ",
      });
    });
  });

  describe("line location to offset conversion", () => {
    it("should convert exact line location to offsets", () => {
      const doc = "Hello\nWorld\nTest";
      const locator = new LineBasedLocator(doc);

      const result = locator.lineLocationToOffset({
        startLineIndex: 1,
        endLineIndex: 1,
        startCharacters: "World",
        endCharacters: "World",
      });

      expect(result).toEqual({
        startOffset: 6,
        endOffset: 11,
        quotedText: "World",
        prefix: "Hello\n",
      });
    });

    it("should handle fuzzy matching with case differences", () => {
      const doc = "Hello\nWORLD\nTest";
      const locator = new LineBasedLocator(doc);

      const result = locator.lineLocationToOffset({
        startLineIndex: 1,
        endLineIndex: 1,
        startCharacters: "world",
        endCharacters: "world",
      });

      expect(result).toEqual({
        startOffset: 6,
        endOffset: 11,
        quotedText: "WORLD",
        prefix: "Hello\n",
      });
    });

    it("should handle partial matches", () => {
      const doc = "The quick brown fox";
      const locator = new LineBasedLocator(doc);

      const result = locator.lineLocationToOffset({
        startLineIndex: 0,
        endLineIndex: 0,
        startCharacters: "quick",
        endCharacters: "fox",
      });

      expect(result).toEqual({
        startOffset: 4,
        endOffset: 19,
        quotedText: "quick brown fox",
        prefix: "The ",
      });
    });

    it("should handle nearby line searching", () => {
      const doc = "Line 1\nLine 2\nLine 3\nLine 4";
      const locator = new LineBasedLocator(doc);

      // Search for "Line 3" but with wrong line index
      const result = locator.lineLocationToOffset({
        startLineIndex: 1, // Wrong - should be 2
        endLineIndex: 1,
        startCharacters: "Line 3",
        endCharacters: "Line 3",
      });

      // Should find fuzzy match in nearby line (finds "Line" in "Line 2")
      expect(result).toEqual({
        startOffset: 7,
        endOffset: 13,
        quotedText: "Line 2",
        prefix: "Line 1\n",
      });
    });

    it("should return null for unfindable text", () => {
      const doc = "Hello World";
      const locator = new LineBasedLocator(doc);

      const result = locator.lineLocationToOffset({
        startLineIndex: 0,
        endLineIndex: 0,
        startCharacters: "xyz",
        endCharacters: "abc",
      });

      expect(result).toBeNull();
    });
  });

  describe("edge cases", () => {
    it("should handle empty document", () => {
      const locator = new LineBasedLocator("");

      expect(locator.getNumberedLines()).toBe("Line 1: ");
      expect(locator.getLineNumber(0)).toBe(1);
    });

    it("should handle document with only newlines", () => {
      const doc = "\n\n\n";
      const locator = new LineBasedLocator(doc);

      const numbered = locator.getNumberedLines();
      expect(numbered).toBe("Line 1: \nLine 2: \nLine 3: \nLine 4: ");
    });

    it("should handle out of bounds line requests", () => {
      const doc = "Single line";
      const locator = new LineBasedLocator(doc);

      expect(locator.getLine(5)).toBe(""); // Line 5 doesn't exist

      const result = locator.lineLocationToOffset({
        startLineIndex: 10,
        endLineIndex: 10,
        startCharacters: "test",
        endCharacters: "test",
      });

      expect(result).toBeNull();
    });

    it("should handle special characters in snippets", () => {
      const doc = "Function: it()\nResult: success";
      const locator = new LineBasedLocator(doc);

      const result = locator.lineLocationToOffset({
        startLineIndex: 0,
        endLineIndex: 0,
        startCharacters: "it()",
        endCharacters: "it()",
      });

      expect(result).toEqual({
        startOffset: 10,
        endOffset: 14,
        quotedText: "it()",
        prefix: "Function: ",
      });
    });

    it("should handle overlapping snippets correctly", () => {
      const doc = "The test test example";
      const locator = new LineBasedLocator(doc);

      // Should find the first occurrence
      const result = locator.lineLocationToOffset({
        startLineIndex: 0,
        endLineIndex: 0,
        startCharacters: "test",
        endCharacters: "test",
      });

      expect(result).toEqual({
        startOffset: 4,
        endOffset: 8,
        quotedText: "test",
        prefix: "The ",
      });
    });

    it("should handle trimmed snippets", () => {
      const doc = "   Indented text here   ";
      const locator = new LineBasedLocator(doc);

      const result = locator.lineLocationToOffset({
        startLineIndex: 0,
        endLineIndex: 0,
        startCharacters: "Indent", // Will be trimmed internally
        endCharacters: "here",
      });

      expect(result?.quotedText).toBe("Indented text here");
    });
  });

  describe("getLineNumber", () => {
    it("should return correct line numbers", () => {
      const doc = "Line 1\nLine 2\nLine 3";
      const locator = new LineBasedLocator(doc);

      expect(locator.getLineNumber(0)).toBe(1); // Start of line 1
      expect(locator.getLineNumber(5)).toBe(1); // End of line 1
      expect(locator.getLineNumber(6)).toBe(1); // Newline
      expect(locator.getLineNumber(7)).toBe(2); // Start of line 2
      expect(locator.getLineNumber(14)).toBe(3); // Start of line 3
    });
  });

  describe("normalized matching", () => {
    it("should handle normalized fuzzy matching", () => {
      const doc = "The (quick) brown-fox!";
      const locator = new LineBasedLocator(doc);

      // Search without special characters
      const result = locator.lineLocationToOffset({
        startLineIndex: 0,
        endLineIndex: 0,
        startCharacters: "quick",
        endCharacters: "fox",
      });

      expect(result).toBeTruthy();
      expect(result?.quotedText).toContain("quick");
      expect(result?.quotedText).toContain("fox");
    });
  });
});
