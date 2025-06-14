import type {
  Comment,
  Highlight,
} from "../types/documentSchema";
import {
  fixOverlappingHighlights,
  highlightsOverlap,
  LineBasedHighlighter,
  type LineCharacterComment,
  validateHighlight,
} from "./highlightUtils";

describe("LineBasedHighlighter", () => {
  const sampleContent = `Crossposted from [my blog](https://benthams.substack.com/p/the-importance-of-blasting-good-ideas). 

When I started this blog in high school, I did not imagine that I would cause [_The Daily Show_](https://www.youtube.com/watch?v=VNbIKtGMoaA) to do an episode about shrimp, containing the following dialogue:

> Andres: I was working in investment banking. My wife was helping refugees, and I saw how meaningful her work was. And I decided to do the same.
>
> Ronny: Oh, so you're helping refugees?
>
> Andres: Well, not quite. I'm helping shrimp.

(Would be a crazy rug pull if, in fact, this did not happen and the dialogue was just pulled out of thin air).`;

  test("creates line-based highlighter correctly", () => {
    const highlighter = new LineBasedHighlighter(sampleContent);
    const stats = highlighter.getStats();

    expect(stats.totalLines).toBeGreaterThan(0);
    expect(stats.totalCharacters).toBe(sampleContent.length);
    expect(stats.averageLineLength).toBeGreaterThan(0);
    expect(stats.longestLine).toBeGreaterThan(0);
  });

  test("gets numbered lines correctly", () => {
    const highlighter = new LineBasedHighlighter(sampleContent);
    const numberedLines = highlighter.getNumberedLines();

    expect(numberedLines).toContain("Line 0:");
    expect(numberedLines).toContain("Line 1:");
    expect(numberedLines.split("\n").length).toBe(
      sampleContent.split("\n").length
    );
  });

  test("creates single-line highlight correctly", () => {
    const highlighter = new LineBasedHighlighter(sampleContent);

    const highlight = highlighter.createHighlight({
      startLineIndex: 0,
      startCharacters: "Cross",
      endLineIndex: 0,
      endCharacters: "blog]",
    });

    expect(highlight).not.toBeNull();
    expect(highlight!.text).toContain("Crossposted");
    expect(highlight!.text).toContain("blog]");
    expect(highlight!.startOffset).toBe(0);
    expect(highlight!.endOffset).toBeGreaterThan(highlight!.startOffset);
  });

  test("creates multi-line highlight correctly", () => {
    const highlighter = new LineBasedHighlighter(sampleContent);

    const highlight = highlighter.createHighlight({
      startLineIndex: 4,
      startCharacters: "> Andre",
      endLineIndex: 8,
      endCharacters: "shrimp.",
    });

    expect(highlight).not.toBeNull();
    expect(highlight!.text).toContain("Andres:");
    expect(highlight!.text).toContain("shrimp.");
    expect(highlight!.startOffset).toBeGreaterThan(0);
    expect(highlight!.endOffset).toBeGreaterThan(highlight!.startOffset);
  });

  test("processes line comments correctly", () => {
    const highlighter = new LineBasedHighlighter(sampleContent);

    const lineComments: LineCharacterComment[] = [
      {
        title: "Opening Hook",
        description:
          "Great opening that connects personal story to broader impact",
        importance: 8,
        highlight: {
          startLineIndex: 0,
          startCharacters: "Cross",
          endLineIndex: 0,
          endCharacters: "blog]",
        },
      },
    ];

    const processedComments = highlighter.processLineComments(lineComments);

    expect(processedComments).toHaveLength(1);
    expect(processedComments[0].isValid).toBe(true);
    expect(processedComments[0].title).toBe("Opening Hook");
    expect(processedComments[0].highlight.isValid).toBe(true);
    expect(processedComments[0].highlight.quotedText).toContain("Crossposted");
  });

  test("handles invalid line indices gracefully", () => {
    const highlighter = new LineBasedHighlighter(sampleContent);

    const highlight = highlighter.createHighlight({
      startLineIndex: 999,
      startCharacters: "nonexistent",
      endLineIndex: 999,
      endCharacters: "text",
    });

    expect(highlight).toBeNull();
  });

  test("handles invalid character snippets gracefully", () => {
    const highlighter = new LineBasedHighlighter(sampleContent);

    const highlight = highlighter.createHighlight({
      startLineIndex: 0,
      startCharacters: "NONEXISTENT",
      endLineIndex: 0,
      endCharacters: "TEXT",
    });

    expect(highlight).toBeNull();
  });
});

describe("UI Helper Functions", () => {
  test("detects overlapping highlights", () => {
    const highlight1: Highlight = {
      startOffset: 10,
      endOffset: 20,
      quotedText: "test text",
      isValid: true,
    };

    const highlight2: Highlight = {
      startOffset: 15,
      endOffset: 25,
      quotedText: "overlapping",
      isValid: true,
    };

    const highlight3: Highlight = {
      startOffset: 30,
      endOffset: 40,
      quotedText: "separate",
      isValid: true,
    };

    expect(highlightsOverlap(highlight1, highlight2)).toBe(true);
    expect(highlightsOverlap(highlight1, highlight3)).toBe(false);
  });

  test("validates highlights correctly", () => {
    const content = "This is a test content for validation.";

    const validHighlight: Highlight = {
      startOffset: 0,
      endOffset: 4,
      quotedText: "This",
      isValid: true,
    };

    const invalidHighlight: Highlight = {
      startOffset: -1,
      endOffset: 4,
      quotedText: "This",
      isValid: true,
    };

    const result1 = validateHighlight(content, validHighlight);
    const result2 = validateHighlight(content, invalidHighlight);

    expect(result1.isValid).toBe(true);
    expect(result2.isValid).toBe(false);
    expect(result2.error).toContain("Invalid offsets");
  });

  test("fixes overlapping highlights", () => {
    const comments: Comment[] = [
      {
        title: "First",
        description: "First comment",
        importance: 5,
        highlight: {
          startOffset: 10,
          endOffset: 20,
          quotedText: "first",
          isValid: true,
        },
        isValid: true,
      },
      {
        title: "Overlapping",
        description: "Overlapping comment",
        importance: 5,
        highlight: {
          startOffset: 15,
          endOffset: 25,
          quotedText: "overlap",
          isValid: true,
        },
        isValid: true,
      },
      {
        title: "Separate",
        description: "Separate comment",
        importance: 5,
        highlight: {
          startOffset: 30,
          endOffset: 40,
          quotedText: "separate",
          isValid: true,
        },
        isValid: true,
      },
    ];

    const fixed = fixOverlappingHighlights(comments);

    expect(fixed).toHaveLength(2);
    expect(fixed[0].title).toBe("First");
    expect(fixed[1].title).toBe("Separate");
  });
});
