import { renderHook } from '@testing-library/react';

import { useHighlightMapper } from './useHighlightMapper';

describe("useHighlightMapper (Phase 1)", () => {
  it("should map basic heading markdown", () => {
    const markdown = "# Strongly Bounded AI";
    const slateText = "Strongly Bounded AI";

    const { result } = renderHook(() =>
      useHighlightMapper(markdown, slateText)
    );
    const { mdToSlateOffset, slateToMdOffset, debug } = result.current;

    // Log debug info
    console.log("Debug:", debug);
    console.log("MD->Slate map:", Object.fromEntries(mdToSlateOffset));
    console.log("Slate->MD map:", Object.fromEntries(slateToMdOffset));

    // Test specific character mappings
    expect(mdToSlateOffset.get(0)).toBeUndefined(); // # is skipped
    expect(mdToSlateOffset.get(1)).toBeUndefined(); // space after # is skipped
    expect(mdToSlateOffset.get(2)).toBe(0); // 'S' in "Strongly"
    expect(mdToSlateOffset.get(3)).toBe(1); // 't' in "Strongly"
    
    // Test reverse mapping
    expect(slateToMdOffset.get(0)).toBe(2); // 'S' maps to position 2 in markdown
  });

  it("should handle simple paragraphs", () => {
    const markdown = "This is a test.\n\nAnother paragraph.";
    const slateText = "This is a test.\n\nAnother paragraph.";

    const { result } = renderHook(() =>
      useHighlightMapper(markdown, slateText)
    );
    const { mdToSlateOffset, slateToMdOffset } = result.current;

    // Character mappings should be 1:1 for simple text
    expect(mdToSlateOffset.get(0)).toBe(0); // 'T' in "This"
    expect(mdToSlateOffset.get(14)).toBe(14); // '.' in "test."
    expect(slateToMdOffset.get(17)).toBe(17); // 'A' in "Another"
  });

  it("should handle simple bold formatting", () => {
    const markdown = "Some **bold** text";
    const slateText = "Some bold text";

    const { result } = renderHook(() =>
      useHighlightMapper(markdown, slateText)
    );
    const { mdToSlateOffset } = result.current;

    // Test specific mappings
    expect(mdToSlateOffset.get(5)).toBeUndefined(); // First * is skipped
    expect(mdToSlateOffset.get(6)).toBeUndefined(); // Second * is skipped
    expect(mdToSlateOffset.get(7)).toBe(5); // 'b' in "bold"
    expect(mdToSlateOffset.get(11)).toBe(9); // 'd' in "bold"
    expect(mdToSlateOffset.get(12)).toBeUndefined(); // First closing * is skipped
    expect(mdToSlateOffset.get(13)).toBeUndefined(); // Second closing * is skipped
    expect(mdToSlateOffset.get(14)).toBe(10); // ' ' after "bold"
  });
});
