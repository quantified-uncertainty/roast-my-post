import { convertHighlightsToComments, validateConvertedHighlights } from "../highlightConverter";
import type { SpellingGrammarHighlight } from "../types";

describe("highlightConverter", () => {
  describe("convertHighlightsToComments", () => {
    test("converts single-line highlight correctly", () => {
      const fullContent = "Line one\nLine two with recieve error\nLine three";
      const highlights: SpellingGrammarHighlight[] = [
        {
          lineStart: 2,
          lineEnd: 2,
          highlightedText: "recieve",
          description: "Spelling: 'recieve' should be 'receive'",
        },
      ];

      const comments = convertHighlightsToComments(highlights, fullContent);

      expect(comments).toHaveLength(1);
      expect(comments[0]).toMatchObject({
        isValid: true,
        description: "Spelling: 'recieve' should be 'receive'",
        highlight: {
          startOffset: 23, // "Line one\nLine two with ".length
          endOffset: 30,   // "Line one\nLine two with recieve".length
          quotedText: "recieve",
          isValid: true,
        },
      });

      // Verify the offsets are correct
      expect(fullContent.substring(23, 30)).toBe("recieve");
    });

    test("converts multi-line highlight correctly", () => {
      const fullContent = "First line\nSecond line with\nerror continuation\nFourth line";
      const highlights: SpellingGrammarHighlight[] = [
        {
          lineStart: 2,
          lineEnd: 3,
          highlightedText: "line with\nerror",
          description: "Grammar error spanning lines",
        },
      ];

      const comments = convertHighlightsToComments(highlights, fullContent);

      expect(comments).toHaveLength(1);
      const highlight = comments[0].highlight;
      expect(fullContent.substring(highlight.startOffset, highlight.endOffset)).toBe("line with\nerror");
    });

    test("handles multiple highlights in order", () => {
      const fullContent = "This have an error. That are wrong too.";
      const highlights: SpellingGrammarHighlight[] = [
        {
          lineStart: 1,
          lineEnd: 1,
          highlightedText: "have",
          description: "Should be 'has'",
        },
        {
          lineStart: 1,
          lineEnd: 1,
          highlightedText: "are",
          description: "Should be 'is'",
        },
      ];

      const comments = convertHighlightsToComments(highlights, fullContent);

      expect(comments).toHaveLength(2);
      expect(fullContent.substring(comments[0].highlight.startOffset, comments[0].highlight.endOffset)).toBe("have");
      expect(fullContent.substring(comments[1].highlight.startOffset, comments[1].highlight.endOffset)).toBe("are");
    });

    test("handles chunk offset correctly", () => {
      const chunkContent = "This is the chunk content";
      const chunkStartOffset = 100; // This chunk starts at character 100 in the full document
      
      const highlights: SpellingGrammarHighlight[] = [
        {
          lineStart: 1,
          lineEnd: 1,
          highlightedText: "chunk",
          description: "Test highlight",
        },
      ];

      const comments = convertHighlightsToComments(highlights, chunkContent, chunkStartOffset);

      expect(comments).toHaveLength(1);
      // The word "chunk" starts at position 12 in the chunk content
      // So in the full document it should be at 100 + 12 = 112
      expect(comments[0].highlight.startOffset).toBe(112);
      expect(comments[0].highlight.endOffset).toBe(117); // 112 + "chunk".length
    });

    test("handles text not found gracefully", () => {
      const fullContent = "Line one\nLine two\nLine three";
      const highlights: SpellingGrammarHighlight[] = [
        {
          lineStart: 2,
          lineEnd: 2,
          highlightedText: "nonexistent text",
          description: "This text doesn't exist",
        },
      ];

      const comments = convertHighlightsToComments(highlights, fullContent);

      expect(comments).toHaveLength(0);
    });

    test("handles invalid line numbers gracefully", () => {
      const fullContent = "Line one\nLine two";
      const highlights: SpellingGrammarHighlight[] = [
        {
          lineStart: 5, // Beyond document
          lineEnd: 5,
          highlightedText: "something",
          description: "Invalid line",
        },
      ];

      const comments = convertHighlightsToComments(highlights, fullContent);

      expect(comments).toHaveLength(0);
    });

    test("performs case-insensitive fallback", () => {
      const fullContent = "This is UPPERCASE text";
      const highlights: SpellingGrammarHighlight[] = [
        {
          lineStart: 1,
          lineEnd: 1,
          highlightedText: "uppercase", // Lowercase in highlight
          description: "Test case sensitivity",
        },
      ];

      const comments = convertHighlightsToComments(highlights, fullContent);

      expect(comments).toHaveLength(1);
      expect(comments[0].highlight.quotedText).toBe("uppercase");
      // Should find "UPPERCASE" in the content
      const { startOffset, endOffset } = comments[0].highlight;
      expect(fullContent.substring(startOffset, endOffset).toLowerCase()).toBe("uppercase");
    });

    test("handles empty lines correctly", () => {
      const fullContent = "Line one\n\n\nLine four with error";
      const highlights: SpellingGrammarHighlight[] = [
        {
          lineStart: 4,
          lineEnd: 4,
          highlightedText: "error",
          description: "Test with empty lines",
        },
      ];

      const comments = convertHighlightsToComments(highlights, fullContent);

      expect(comments).toHaveLength(1);
      const { startOffset, endOffset } = comments[0].highlight;
      expect(fullContent.substring(startOffset, endOffset)).toBe("error");
    });
  });

  describe("validateConvertedHighlights", () => {
    test("validates correct highlights", () => {
      const fullContent = "This is a test document";
      const comments = [
        {
          description: "Test",
          importance: 5,
          highlight: {
            startOffset: 5,
            endOffset: 7,
            quotedText: "is",
            isValid: true,
          },
          isValid: true,
        },
      ];

      const isValid = validateConvertedHighlights(comments, fullContent);
      expect(isValid).toBe(true);
    });

    test("detects invalid offsets", () => {
      const fullContent = "Short";
      const comments = [
        {
          description: "Test",
          importance: 5,
          highlight: {
            startOffset: 10, // Beyond content
            endOffset: 15,
            quotedText: "text",
            isValid: true,
          },
          isValid: true,
        },
      ];

      const isValid = validateConvertedHighlights(comments, fullContent);
      expect(isValid).toBe(false);
    });

    test("detects text mismatch", () => {
      const fullContent = "This is a test";
      const comments = [
        {
          description: "Test",
          importance: 5,
          highlight: {
            startOffset: 0,
            endOffset: 4,
            quotedText: "That", // Mismatch: actual is "This"
            isValid: true,
          },
          isValid: true,
        },
      ];

      const isValid = validateConvertedHighlights(comments, fullContent);
      expect(isValid).toBe(false);
    });

    test("skips invalid comments", () => {
      const fullContent = "Valid content";
      const comments = [
        {
          description: "Invalid",
          importance: 5,
          highlight: {
            startOffset: -1,
            endOffset: -1,
            quotedText: "",
            isValid: false,
          },
          isValid: false,
        },
        {
          description: "Valid",
          importance: 5,
          highlight: {
            startOffset: 0,
            endOffset: 5,
            quotedText: "Valid",
            isValid: true,
          },
          isValid: true,
        },
      ];

      const isValid = validateConvertedHighlights(comments, fullContent);
      expect(isValid).toBe(true); // Should pass because invalid comment is skipped
    });
  });
});