// --- Test File: src/utils/highlightUtils.test.ts ---

import type {
  Comment,
  DocumentReview,
} from '../types/documentReview';
import type {
  CalculatedHighlight,
  RawLLMHighlight,
} from './highlightUtils.js';
// Import the types and the functions to test
import {
  calculateHighlightOffsets,
  fixOverlappingHighlights,
  highlightsOverlap,
  processRawComments,
  validateAndFixDocumentReview,
  validateHighlights,
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

describe("highlightsOverlap", () => {
  test("should detect when highlights start within each other", () => {
    // First highlight: 10-20, Second highlight: 15-30
    expect(
      highlightsOverlap(
        { startOffset: 10, endOffset: 20, quotedText: "test" },
        { startOffset: 15, endOffset: 30, quotedText: "test" }
      )
    ).toBe(true);

    // First highlight: 15-30, Second highlight: 10-20
    expect(
      highlightsOverlap(
        { startOffset: 15, endOffset: 30, quotedText: "test" },
        { startOffset: 10, endOffset: 20, quotedText: "test" }
      )
    ).toBe(true);
  });

  test("should detect when one highlight contains another", () => {
    // First contains second
    expect(
      highlightsOverlap(
        { startOffset: 10, endOffset: 30, quotedText: "test" },
        { startOffset: 15, endOffset: 25, quotedText: "test" }
      )
    ).toBe(true);

    // Second contains first
    expect(
      highlightsOverlap(
        { startOffset: 15, endOffset: 25, quotedText: "test" },
        { startOffset: 10, endOffset: 30, quotedText: "test" }
      )
    ).toBe(true);
  });

  test("should return false when highlights do not overlap", () => {
    // Sequential highlights
    expect(
      highlightsOverlap(
        { startOffset: 10, endOffset: 20, quotedText: "test" },
        { startOffset: 20, endOffset: 30, quotedText: "test" }
      )
    ).toBe(false);

    // Separated highlights
    expect(
      highlightsOverlap(
        { startOffset: 10, endOffset: 20, quotedText: "test" },
        { startOffset: 30, endOffset: 40, quotedText: "test" }
      )
    ).toBe(false);
  });
});

describe("validateHighlights", () => {
  test("should return valid=true for non-overlapping highlights", () => {
    const review: DocumentReview = {
      agentId: "test-agent",
      costInCents: 100,
      createdAt: new Date(),
      comments: {
        "1": {
          title: "Comment 1",
          description: "Description 1",
          highlight: { startOffset: 10, endOffset: 20, quotedText: "text 1" },
        },
        "2": {
          title: "Comment 2",
          description: "Description 2",
          highlight: { startOffset: 30, endOffset: 40, quotedText: "text 2" },
        },
      },
    };

    const result = validateHighlights(review);
    expect(result.valid).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  test("should return valid=false with error messages for overlapping highlights", () => {
    const review: DocumentReview = {
      agentId: "test-agent",
      costInCents: 100,
      createdAt: new Date(),
      comments: {
        "1": {
          title: "Comment 1",
          description: "Description 1",
          highlight: { startOffset: 10, endOffset: 30, quotedText: "text 1" },
        },
        "2": {
          title: "Comment 2",
          description: "Description 2",
          highlight: { startOffset: 20, endOffset: 40, quotedText: "text 2" },
        },
      },
    };

    const result = validateHighlights(review);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBe(1);
    expect(result.errors[0]).toContain(
      "Highlight for comment 1 overlaps with highlight for comment 2"
    );
  });

  test("should detect multiple overlapping highlights", () => {
    const review: DocumentReview = {
      agentId: "test-agent",
      costInCents: 100,
      createdAt: new Date(),
      comments: {
        "1": {
          title: "Comment 1",
          description: "Description 1",
          highlight: { startOffset: 10, endOffset: 30, quotedText: "text 1" },
        },
        "2": {
          title: "Comment 2",
          description: "Description 2",
          highlight: { startOffset: 20, endOffset: 40, quotedText: "text 2" },
        },
        "3": {
          title: "Comment 3",
          description: "Description 3",
          highlight: { startOffset: 25, endOffset: 35, quotedText: "text 3" },
        },
      },
    };

    const result = validateHighlights(review);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBe(3); // All three highlights overlap with each other
  });
});

describe("fixOverlappingHighlights", () => {
  test("should fix highlights that start inside another highlight", () => {
    const comments: Record<string, Comment> = {
      "1": {
        title: "Comment 1",
        description: "Description 1",
        highlight: { startOffset: 10, endOffset: 30, quotedText: "text 1" },
      },
      "2": {
        title: "Comment 2",
        description: "Description 2",
        highlight: { startOffset: 20, endOffset: 40, quotedText: "text 2" },
      },
    };

    const fixed = fixOverlappingHighlights(comments);

    // Comment 1 should be unchanged as it starts first
    expect(fixed["1"].highlight.startOffset).toBe(10);
    expect(fixed["1"].highlight.endOffset).toBe(30);

    // Comment 2 should be adjusted to start after comment 1 ends
    expect(fixed["2"].highlight.startOffset).toBe(30);
    expect(fixed["2"].highlight.endOffset).toBe(40);
  });

  test("should fix highlights when one contains another", () => {
    const comments: Record<string, Comment> = {
      "1": {
        title: "Comment 1",
        description: "Description 1",
        highlight: { startOffset: 10, endOffset: 50, quotedText: "text 1" },
      },
      "2": {
        title: "Comment 2",
        description: "Description 2",
        highlight: { startOffset: 20, endOffset: 30, quotedText: "text 2" },
      },
    };

    const fixed = fixOverlappingHighlights(comments);

    // Comment 1 should be unchanged as it starts first
    expect(fixed["1"].highlight.startOffset).toBe(10);
    expect(fixed["1"].highlight.endOffset).toBe(50);

    // Comment 2 should not be included as it's completely inside comment 1
    expect(fixed["2"]).toBeUndefined();
  });

  test("should handle complex overlapping scenarios with multiple highlights", () => {
    const comments: Record<string, Comment> = {
      "1": {
        title: "Comment 1",
        description: "Description 1",
        highlight: { startOffset: 10, endOffset: 30, quotedText: "text 1" },
      },
      "2": {
        title: "Comment 2",
        description: "Description 2",
        highlight: { startOffset: 20, endOffset: 40, quotedText: "text 2" },
      },
      "3": {
        title: "Comment 3",
        description: "Description 3",
        highlight: { startOffset: 35, endOffset: 50, quotedText: "text 3" },
      },
      "4": {
        title: "Comment 4",
        description: "Description 4",
        highlight: { startOffset: 60, endOffset: 70, quotedText: "text 4" },
      },
    };

    const fixed = fixOverlappingHighlights(comments);

    // Comment 1 should be unchanged (first)
    expect(fixed["1"].highlight.startOffset).toBe(10);
    expect(fixed["1"].highlight.endOffset).toBe(30);

    // Comment 2 should be adjusted to start after comment 1
    expect(fixed["2"].highlight.startOffset).toBe(30);
    expect(fixed["2"].highlight.endOffset).toBe(40);

    // Comment 3 should be adjusted to start after comment 2 ends
    // It originally started at 35 which overlaps with comment 2's adjusted range of 30-40
    expect(fixed["3"].highlight.startOffset).toBe(40);
    expect(fixed["3"].highlight.endOffset).toBe(50);

    // Comment 4 should remain unchanged as it doesn't overlap with anything
    expect(fixed["4"].highlight.startOffset).toBe(60);
    expect(fixed["4"].highlight.endOffset).toBe(70);
  });
});

describe("validateAndFixDocumentReview", () => {
  test("should fix overlapping highlights in a document review", () => {
    const review: DocumentReview = {
      agentId: "test-agent",
      costInCents: 100,
      createdAt: new Date(),
      comments: {
        "1": {
          title: "Comment 1",
          description: "Description 1",
          highlight: { startOffset: 10, endOffset: 30, quotedText: "text 1" },
        },
        "2": {
          title: "Comment 2",
          description: "Description 2",
          highlight: { startOffset: 20, endOffset: 40, quotedText: "text 2" },
        },
      },
    };

    const fixed = validateAndFixDocumentReview(review);

    // Original review should be unchanged
    expect(review.comments["1"].highlight.startOffset).toBe(10);
    expect(review.comments["2"].highlight.startOffset).toBe(20);

    // Fixed review should have adjusted comment 2
    expect(fixed.comments["1"].highlight.startOffset).toBe(10);
    expect(fixed.comments["1"].highlight.endOffset).toBe(30);
    expect(fixed.comments["2"].highlight.startOffset).toBe(30);
    expect(fixed.comments["2"].highlight.endOffset).toBe(40);

    // Validate the fixed review should pass
    const validation = validateHighlights(fixed);
    expect(validation.valid).toBe(true);
  });
});
