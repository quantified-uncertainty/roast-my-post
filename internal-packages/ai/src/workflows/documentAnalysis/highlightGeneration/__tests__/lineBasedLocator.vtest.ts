import { describe, expect, it } from "vitest";

import { LineBasedLocator } from "@roast/ai/text-location/line-based";

import type { LineBasedHighlight } from "../types";

describe("LineBasedLocator (for highlight generation)", () => {
  const sampleContent = `Crossposted from [my blog](https://benthams.substack.com/p/the-importance-of-blasting-good-ideas). 

When I started this blog in high school, I did not imagine that I would cause [_The Daily Show_](https://www.youtube.com/watch?v=VNbIKtGMoaA) to do an episode about shrimp, containing the following dialogue:

> Andres: I was working in investment banking. My wife was helping refugees, and I saw how meaningful her work was. And I decided to do the same.
>
> Ronny: Oh, so you're helping refugees?
>
> Andres: Well, not quite. I'm helping shrimp.

(Would be a crazy rug pull if, in fact, this did not happen and the dialogue was just pulled out of thin air).`;

  it("creates line-based locator correctly", () => {
    const locator = new LineBasedLocator(sampleContent);
    const stats = locator.getStats();

    expect(stats.totalLines).toBeGreaterThan(0);
    expect(stats.totalCharacters).toBe(sampleContent.length);
    expect(stats.averageLineLength).toBeGreaterThan(0);
    expect(stats.longestLine).toBeGreaterThan(0);
  });

  it("gets numbered lines correctly", () => {
    const locator = new LineBasedLocator(sampleContent);
    const numberedLines = locator.getNumberedLines();

    expect(numberedLines).toContain("Line 1:");
    expect(numberedLines).toContain("Line 2:");
    expect(numberedLines.split("\n").length).toBe(
      sampleContent.split("\n").length
    );
  });

  it("creates single-line highlight correctly", () => {
    const locator = new LineBasedLocator(sampleContent);

    const highlight = locator.lineLocationToOffset({
      startLineIndex: 0,
      startCharacters: "Cross",
      endLineIndex: 0,
      endCharacters: "blog]",
    });

    expect(highlight).not.toBeNull();
    expect(highlight!.quotedText).toContain("Crossposted");
    expect(highlight!.quotedText).toContain("blog]");
    expect(highlight!.startOffset).toBe(0);
    expect(highlight!.endOffset).toBeGreaterThan(highlight!.startOffset);
  });

  it("creates multi-line highlight correctly", () => {
    const locator = new LineBasedLocator(sampleContent);

    const highlight = locator.lineLocationToOffset({
      startLineIndex: 4,
      startCharacters: "> Andre",
      endLineIndex: 8,
      endCharacters: "shrimp.",
    });

    expect(highlight).not.toBeNull();
    expect(highlight!.quotedText).toContain("Andres:");
    expect(highlight!.quotedText).toContain("shrimp.");
    expect(highlight!.startOffset).toBeGreaterThan(0);
    expect(highlight!.endOffset).toBeGreaterThan(highlight!.startOffset);
  });

  it("processes line comments correctly", () => {
    const locator = new LineBasedLocator(sampleContent);

    const lineComments: LineBasedHighlight[] = [
      {
        description:
          "Opening Hook. Great opening that connects personal story to broader impact",
        importance: 8,
        highlight: {
          startLineIndex: 0,
          startCharacters: "Cross",
          endLineIndex: 0,
          endCharacters: "blog]",
        },
      },
    ];

    // Process highlights manually like the validator does
    const processedComments = [];
    for (const comment of lineComments) {
      const result = locator.lineLocationToOffset(comment.highlight);
      if (result) {
        processedComments.push({
          description: comment.description,
          importance: comment.importance,
          isValid: true,
          highlight: {
            startOffset: result.startOffset,
            endOffset: result.endOffset,
            quotedText: result.quotedText,
            isValid: true,
            prefix: result.prefix,
          },
        });
      }
    }

    expect(processedComments).toHaveLength(1);
    expect(processedComments[0].isValid).toBe(true);
    expect(processedComments[0].description).toContain("Opening Hook");
    expect(processedComments[0].highlight.isValid).toBe(true);
    expect(processedComments[0].highlight.quotedText).toContain("Crossposted");
  });

  it("handles invalid line indices gracefully", () => {
    const locator = new LineBasedLocator(sampleContent);

    const highlight = locator.lineLocationToOffset({
      startLineIndex: 999,
      startCharacters: "nonexistent",
      endLineIndex: 999,
      endCharacters: "text",
    });

    expect(highlight).toBeNull();
  });

  it("handles invalid character snippets gracefully", () => {
    const locator = new LineBasedLocator(sampleContent);

    const highlight = locator.lineLocationToOffset({
      startLineIndex: 0,
      startCharacters: "NONEXISTENT",
      endLineIndex: 0,
      endCharacters: "TEXT",
    });

    expect(highlight).toBeNull();
  });
});
