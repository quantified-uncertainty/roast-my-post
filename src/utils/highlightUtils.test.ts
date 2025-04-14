// --- Test File: src/utils/highlightUtils.test.ts ---

import type { Comment } from '../types/documentReview';
import type {
  CalculatedHighlight,
  RawLLMHighlight,
} from './highlightUtils.js';
// Import the types and the functions to test
import {
  calculateHighlightOffsets,
  processRawComments,
} from './highlightUtils.js';

describe("calculateHighlightOffsets", () => {
  const sampleContent =
    "This is the first sentence.\nHere is the second sentence, which is a bit longer.\nFinally, the third sentence ends the document.";
  // Indices:
  // First sentence: 0-26
  // Second sentence: 27-84 (starts with 'H')
  // Third sentence: 85-133 (starts with 'F')

  test("should return correct offsets for a valid simple highlight", () => {
    const rawHighlight: RawLLMHighlight = {
      startText: "second sentence",
      quotedText: "second sentence, which is a bit longer.",
      prefix: "Here is the ",
    };
    const expected: CalculatedHighlight = {
      startOffset: 40,
      endOffset: 79,
      prefix: "Here is the ",
      quotedText: "second sentence, which is a bit longer.",
    };
    expect(calculateHighlightOffsets(sampleContent, rawHighlight)).toEqual(
      expected
    );
  });

  test("should return null if startText is not found", () => {
    const rawHighlight: RawLLMHighlight = {
      startText: "nonexistent text",
      quotedText: "some quote",
    };
    expect(calculateHighlightOffsets(sampleContent, rawHighlight)).toBeNull();
  });

  test("should return null if quotedText does not match content at startText location", () => {
    const rawHighlight: RawLLMHighlight = {
      startText: "second sentence",
      quotedText: "second sentence, which is different.", // Mismatch
      prefix: "Here is the ",
    };
    expect(calculateHighlightOffsets(sampleContent, rawHighlight)).toBeNull();
  });

  test("should return null if quotedText is empty", () => {
    const rawHighlight: RawLLMHighlight = {
      startText: "second sentence",
      quotedText: "", // Empty quote
    };
    expect(calculateHighlightOffsets(sampleContent, rawHighlight)).toBeNull();
  });

  test("should find the first occurrence if startText appears multiple times (simple strategy)", () => {
    const multiContent = "find me here, then find me here again.";
    const rawHighlight: RawLLMHighlight = {
      startText: "find me",
      quotedText: "find me here",
      prefix: "n ", // prefix for the second occurrence, but we ignore it for now
    };
    const expected: CalculatedHighlight = {
      startOffset: 0,
      endOffset: 12, // 'find me here' length is 12
      prefix: "n ",
      quotedText: "find me here",
    };
    expect(calculateHighlightOffsets(multiContent, rawHighlight)).toEqual(
      expected
    );
  });

  test("should use searchStartIndex to find later occurrences", () => {
    const multiContent = "find me here, then find me here again.";
    const rawHighlight: RawLLMHighlight = {
      startText: "find me",
      quotedText: "find me here again.",
      prefix: "n ",
    };
    const expected: CalculatedHighlight = {
      startOffset: 19,
      endOffset: 38,
      prefix: "n ",
      quotedText: "find me here again.",
    };
    expect(calculateHighlightOffsets(multiContent, rawHighlight, 1)).toEqual(
      expected
    );
  });

  test("should handle highlights spanning newlines", () => {
    const rawHighlight: RawLLMHighlight = {
      startText: "second sentence",
      quotedText:
        "second sentence, which is a bit longer.\nFinally, the third sentence",
      prefix: "Here is the ",
    };
    const expected: CalculatedHighlight = {
      startOffset: 40,
      endOffset: 107,
      prefix: "Here is the ",
      quotedText:
        "second sentence, which is a bit longer.\nFinally, the third sentence",
    };
    expect(calculateHighlightOffsets(sampleContent, rawHighlight)).toEqual(
      expected
    );
  });

  test("should return null if startText is found but quotedText runs past end of content", () => {
    const rawHighlight: RawLLMHighlight = {
      startText: "third sentence",
      quotedText: "third sentence ends the document AND MORE TEXT", // Runs past end
      prefix: "Finally, the ",
    };
    expect(calculateHighlightOffsets(sampleContent, rawHighlight)).toBeNull();
  });
});

describe("processRawComments", () => {
  const sampleContent = "Line one.\nLine two is longer.\nLine three.";
  const baseRawComment = {
    title: "Test Title",
    description: "Test Description",
  };

  test("should process a single valid comment", () => {
    const rawComments = {
      "1": {
        ...baseRawComment,
        highlight: {
          startText: "Line one",
          quotedText: "Line one.",
          prefix: "",
        },
      },
    };
    const expected: Record<string, Comment> = {
      "1": {
        title: "Test Title",
        description: "Test Description",
        highlight: {
          startOffset: 0,
          endOffset: 9,
          prefix: "",
          quotedText: "Line one.",
        },
      },
    };
    const result = processRawComments(sampleContent, rawComments);
    expect(result).toEqual(expected);
  });

  test("should process multiple valid comments, checking correct offsets", () => {
    const rawComments = {
      "1": {
        title: "C1",
        description: "D1",
        highlight: {
          startText: "Line one",
          quotedText: "Line one.",
          prefix: "",
        },
      },
      "2": {
        title: "C2",
        description: "D2",
        highlight: {
          startText: "Line two",
          quotedText: "Line two is longer.",
          prefix: "\n",
        },
      },
    };
    const expected: Record<string, Comment> = {
      "1": {
        title: "C1",
        description: "D1",
        highlight: {
          startOffset: 0,
          endOffset: 9,
          prefix: "",
          quotedText: "Line one.",
        },
      },
      "2": {
        title: "C2",
        description: "D2",
        highlight: {
          startOffset: 10,
          endOffset: 29,
          prefix: "\n",
          quotedText: "Line two is longer.",
        },
      },
    };
    const result = processRawComments(sampleContent, rawComments);
    expect(result).toEqual(expected);
  });

  test("should skip comments where highlight calculation naturally fails (e.g., mismatch)", () => {
    const rawComments = {
      "1": {
        title: "C1",
        description: "D1",
        highlight: {
          startText: "Line one",
          quotedText: "Line one.",
          prefix: "",
        },
      },
      bad: {
        title: "CBad",
        description: "DBad",
        highlight: {
          startText: "Line two",
          quotedText: "Line two is WRONG.",
          prefix: "\n",
        },
      },
      "2": {
        title: "C2",
        description: "D2",
        highlight: {
          startText: "Line three",
          quotedText: "Line three.",
          prefix: "\n",
        },
      },
    };
    const expected: Record<string, Comment> = {
      "1": {
        title: "C1",
        description: "D1",
        highlight: {
          startOffset: 0,
          endOffset: 9,
          prefix: "",
          quotedText: "Line one.",
        },
      },
      "2": {
        title: "C2",
        description: "D2",
        highlight: {
          startOffset: 30,
          endOffset: 41,
          prefix: "\n",
          quotedText: "Line three.",
        },
      },
    };
    const result = processRawComments(sampleContent, rawComments);
    expect(result).toEqual(expected);
  });

  test("should skip comments missing title, description, or highlight object", () => {
    const rawComments = {
      noTitle: {
        description: "D",
        highlight: { startText: "L", quotedText: "L" },
      },
      noDesc: { title: "T", highlight: { startText: "L", quotedText: "L" } },
      noHl: { title: "T", description: "D" },
      ok: {
        ...baseRawComment,
        highlight: { startText: "Line one", quotedText: "Line one." },
      },
    } as any;
    const expected: Record<string, Comment> = {
      ok: {
        ...baseRawComment,
        highlight: {
          startOffset: 0,
          endOffset: 9,
          prefix: undefined,
          quotedText: "Line one.",
        },
      },
    };
    const result = processRawComments(sampleContent, rawComments);
    expect(result).toEqual(expected);
  });

  test("should skip comments with highlight missing startText or quotedText", () => {
    const rawComments = {
      noStart: { ...baseRawComment, highlight: { quotedText: "L" } },
      noQuote: { ...baseRawComment, highlight: { startText: "L" } },
      ok: {
        ...baseRawComment,
        highlight: { startText: "Line one", quotedText: "Line one." },
      },
    } as any;
    const expected: Record<string, Comment> = {
      ok: {
        ...baseRawComment,
        highlight: {
          startOffset: 0,
          endOffset: 9,
          prefix: undefined,
          quotedText: "Line one.",
        },
      },
    };
    const result = processRawComments(sampleContent, rawComments);
    expect(result).toEqual(expected);
  });

  test("should return empty object if rawComments input is undefined or null", () => {
    expect(processRawComments(sampleContent, undefined)).toEqual({});
    expect(processRawComments(sampleContent, null as any)).toEqual({});
  });

  test("should return empty object if rawComments input is empty", () => {
    expect(processRawComments(sampleContent, {})).toEqual({});
  });
});
