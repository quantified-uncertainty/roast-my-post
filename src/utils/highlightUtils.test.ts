import {
  calculateHighlightOffsets,
  processRawComments,
} from "./highlightUtils";

// Mock the OpenAI client
jest.mock("../types/openai", () => ({
  openai: {
    chat: {
      completions: {
        create: jest.fn(),
      },
    },
  },
  DEFAULT_TEMPERATURE: 0.7,
  SEARCH_MODEL: "test-model",
}));

describe("calculateHighlightOffsets", () => {
  const sampleContent = `When I started this blog in high school, I did not imagine that I would cause _The Daily Show_ to do an episode about shrimp, containing the following dialogue:

> Andres: I was working in investment banking. My wife was helping refugees, and I saw how meaningful her work was. And I decided to do the same.
>
> Ronny: Oh, so you're helping refugees?
>
> Andres: Well, not quite. I'm helping shrimp.

(Would be a crazy rug pull if, in fact, this did not happen and the dialogue was just pulled out of thin air).

But just a few years after my blog was born, some Daily Show producer came across it.`;

  test("handles markdown emphasis in start text", () => {
    const highlight = {
      start:
        "When I started this blog in high school, I did not imagine that I would cause _The Daily Show_ to do an episode about shrimp",
      end: "containing the following dialogue:",
    };

    const result = calculateHighlightOffsets(sampleContent, highlight);
    expect(result).not.toBeNull();
    expect(result?.startOffset).toBe(0);
    expect(result?.endOffset).toBeGreaterThan(result?.startOffset || 0);
    expect(result?.quotedText).toContain("The Daily Show");
  });

  test("handles markdown emphasis in end text", () => {
    const highlight = {
      start: "Andres: I was working in investment banking",
      end: "Andres: Well, not quite. I'm helping shrimp.",
    };

    const result = calculateHighlightOffsets(sampleContent, highlight);
    expect(result).not.toBeNull();
    expect(result?.startOffset).toBeGreaterThanOrEqual(0);
    expect(result?.endOffset).toBeGreaterThan(result?.startOffset || 0);
    expect(result?.quotedText).toContain("helping shrimp");
  });

  test("handles text with different markdown variations", () => {
    const highlight = {
      start:
        "When I started this blog in high school, I did not imagine that I would cause The Daily Show to do an episode about shrimp",
      end: "containing the following dialogue:",
    };

    const result = calculateHighlightOffsets(sampleContent, highlight);
    expect(result).not.toBeNull();
    expect(result?.startOffset).toBe(0);
    expect(result?.endOffset).toBeGreaterThan(result?.startOffset || 0);
  });

  test("handles text with blockquotes", () => {
    const highlight = {
      start:
        "Andres: I was working in investment banking. My wife was helping refugees",
      end: "Andres: Well, not quite. I'm helping shrimp.",
    };

    const result = calculateHighlightOffsets(sampleContent, highlight);
    expect(result).not.toBeNull();
    expect(result?.startOffset).toBeGreaterThanOrEqual(0);
    expect(result?.endOffset).toBeGreaterThan(result?.startOffset || 0);
    expect(result?.quotedText).toContain("helping refugees");
  });

  test("handles text with multiple spaces", () => {
    const highlight = {
      start:
        "When I started this blog in high school,  I did not imagine that I would cause _The Daily Show_ to do an episode about shrimp",
      end: "containing the following dialogue:",
    };

    const result = calculateHighlightOffsets(sampleContent, highlight);
    expect(result).not.toBeNull();
    expect(result?.startOffset).toBe(0);
    expect(result?.endOffset).toBeGreaterThan(result?.startOffset || 0);
  });

  test("handles text with different emphasis markers", () => {
    const highlight = {
      start:
        "When I started this blog in high school, I did not imagine that I would cause *The Daily Show* to do an episode about shrimp",
      end: "containing the following dialogue:",
    };

    const result = calculateHighlightOffsets(sampleContent, highlight);
    expect(result).not.toBeNull();
    expect(result?.startOffset).toBe(0);
    expect(result?.endOffset).toBeGreaterThan(result?.startOffset || 0);
  });

  test("handles text with mixed markdown", () => {
    const highlight = {
      start:
        "When I started this blog in high school, I did not imagine that I would cause [_The Daily Show_](https://www.youtube.com/watch?v=VNbIKtGMoaA) to do an episode about shrimp",
      end: "containing the following dialogue:",
    };

    const result = calculateHighlightOffsets(sampleContent, highlight);
    expect(result).not.toBeNull();
    expect(result?.startOffset).toBe(0);
    expect(result?.endOffset).toBeGreaterThan(result?.startOffset || 0);
  });

  test("handles text with newlines", () => {
    const highlight = {
      start:
        "Andres: I was working in investment banking.\nMy wife was helping refugees",
      end: "Andres: Well, not quite. I'm helping shrimp.",
    };

    const result = calculateHighlightOffsets(sampleContent, highlight);
    expect(result).not.toBeNull();
    expect(result?.startOffset).toBeGreaterThanOrEqual(0);
    expect(result?.endOffset).toBeGreaterThan(result?.startOffset || 0);
  });

  test("handles text with special characters", () => {
    const highlight = {
      start:
        "Andres: I was working in investment banking. My wife was helping refugees, and I saw how meaningful her work was.",
      end: "Andres: Well, not quite. I'm helping shrimp.",
    };

    const result = calculateHighlightOffsets(sampleContent, highlight);
    expect(result).not.toBeNull();
    expect(result?.startOffset).toBeGreaterThanOrEqual(0);
    expect(result?.endOffset).toBeGreaterThan(result?.startOffset || 0);
  });

  test("handles text with parentheses", () => {
    const highlight = {
      start: "(Would be a crazy rug pull if, in fact, this did not happen",
      end: "was just pulled out of thin air).",
    };

    const result = calculateHighlightOffsets(sampleContent, highlight);
    expect(result).not.toBeNull();
    expect(result?.startOffset).toBeGreaterThanOrEqual(0);
    expect(result?.endOffset).toBeGreaterThan(result?.startOffset || 0);
  });

  test("handles edge case with no matches", () => {
    const highlight = {
      start: "This text does not exist in the content",
      end: "Neither does this text",
    };

    const result = calculateHighlightOffsets(sampleContent, highlight);
    expect(result).toBeNull();
  });

  test("handles case where end comes before start", () => {
    const highlight = {
      start: "some Daily Show producer came across it",
      end: "containing the following dialogue:",
    };

    const result = calculateHighlightOffsets(sampleContent, highlight);
    expect(result).toBeNull();
  });
});

describe("processRawComments", () => {
  const sampleContent = `When I started this blog in high school, I did not imagine that I would cause _The Daily Show_ to do an episode about shrimp, containing the following dialogue:

> Andres: I was working in investment banking. My wife was helping refugees, and I saw how meaningful her work was. And I decided to do the same.
>
> Ronny: Oh, so you're helping refugees?
>
> Andres: Well, not quite. I'm helping shrimp.`;

  test("processes comments with improved highlight matching", async () => {
    const rawComments = [
      {
        title: "Test Comment",
        description: "A test comment",
        importance: 75,
        grade: 80,
        isValid: true,
        highlight: {
          start:
            "When I started this blog in high school, I did not imagine that I would cause _The Daily Show_ to do an episode about shrimp",
          end: "containing the following dialogue:",
        },
      },
    ];

    const result = await processRawComments(sampleContent, rawComments);

    expect(result).toHaveLength(1);
    expect(result[0].isValid).toBe(true);
    expect(result[0].highlight.startOffset).toBe(0);
    expect(result[0].highlight.endOffset).toBeGreaterThan(0);
    expect(result[0].highlight.quotedText).toContain("The Daily Show");
    expect(result[0].error).toBeUndefined();
  });

  test("handles failed highlight matching gracefully", async () => {
    const rawComments = [
      {
        title: "Invalid Comment",
        description: "A comment with non-existent text",
        importance: 50,
        grade: 50,
        isValid: true,
        highlight: {
          start: "This text does not exist",
          end: "Neither does this text",
        },
      },
    ];

    const result = await processRawComments(sampleContent, rawComments);

    expect(result).toHaveLength(1);
    expect(result[0].isValid).toBe(false);
    expect(result[0].highlight.startOffset).toBe(-1);
    expect(result[0].highlight.endOffset).toBe(-1);
    expect(result[0].error).toBe(
      "Could not find valid highlight text in document"
    );
  });

  test("processes multiple comments correctly", async () => {
    const rawComments = [
      {
        title: "First Comment",
        description: "First test comment",
        importance: 75,
        grade: 80,
        isValid: true,
        highlight: {
          start: "When I started this blog",
          end: "The Daily Show",
        },
      },
      {
        title: "Second Comment",
        description: "Second test comment",
        importance: 60,
        grade: 70,
        isValid: true,
        highlight: {
          start: "Andres: I was working in investment banking",
          end: "I'm helping shrimp.",
        },
      },
    ];

    const result = await processRawComments(sampleContent, rawComments);

    expect(result).toHaveLength(2);
    expect(result[0].isValid).toBe(true);
    expect(result[1].isValid).toBe(true);
    expect(result[0].highlight.startOffset).toBeGreaterThanOrEqual(0);
    expect(result[1].highlight.startOffset).toBeGreaterThanOrEqual(0);
  });
});
