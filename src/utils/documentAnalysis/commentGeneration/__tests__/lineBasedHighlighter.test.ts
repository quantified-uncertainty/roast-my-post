import {
  LineBasedHighlighter,
  type LineBasedComment,
} from "../lineBasedHighlighter";

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

    const lineComments: LineBasedComment[] = [
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