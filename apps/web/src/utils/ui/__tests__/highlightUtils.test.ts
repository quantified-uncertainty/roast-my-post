import type { Highlight, Comment } from "@/types/databaseTypes";
import {
  fixOverlappingHighlights,
  highlightsOverlap,
  validateHighlight,
} from "../highlightUtils";

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
        description: "First comment",
        importance: 5,
        grade: null,
        highlight: {
          startOffset: 10,
          endOffset: 20,
          quotedText: "first",
          isValid: true,
        },
        header: "First comment",
        level: "info",
        source: "test",
        metadata: {
          pluginName: "test",
          timestamp: new Date().toISOString(),
          chunkId: "test",
          processingTimeMs: 0,
          toolChain: []
        }
      },
      {
        description: "Overlapping comment",
        importance: 5,
        grade: null,
        highlight: {
          startOffset: 15,
          endOffset: 25,
          quotedText: "overlap",
          isValid: true,
        },
        header: "Overlapping comment",
        level: "info",
        source: "test",
        metadata: {
          pluginName: "test",
          timestamp: new Date().toISOString(),
          chunkId: "test",
          processingTimeMs: 0,
          toolChain: []
        }
      },
      {
        description: "Separate comment",
        importance: 5,
        grade: null,
        highlight: {
          startOffset: 30,
          endOffset: 40,
          quotedText: "separate",
          isValid: true,
        },
        header: "Separate comment",
        level: "info",
        source: "test",
        metadata: {
          pluginName: "test",
          timestamp: new Date().toISOString(),
          chunkId: "test",
          processingTimeMs: 0,
          toolChain: []
        }
      },
    ];

    const fixed = fixOverlappingHighlights(comments);

    expect(fixed).toHaveLength(2);
    expect(fixed[0].description).toBe("First comment");
    expect(fixed[1].description).toBe("Separate comment");
  });
});
