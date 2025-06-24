/**
 * @jest-environment jsdom
 */
import { renderHook } from "@testing-library/react";

import { useHighlightMapper } from "./useHighlightMapper";

describe("useHighlightMapper (Phase 2)", () => {
  it("should map basic heading markdown using diff-match-patch", () => {
    const markdown = "# Strongly Bounded AI";
    const slateText = "Strongly Bounded AI";

    const { result } = renderHook(() =>
      useHighlightMapper(markdown, slateText)
    );
    const { mdToSlateOffset, slateToMdOffset, debug } = result.current;

    // Log debug info
    console.log("Diffs:", debug.diffs);
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

  it("should handle bold formatting", () => {
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

  it("should handle complex markdown with lists and formatting", () => {
    const markdown = `This concept isn't just about alignment. It's also about:

* Substantial capability restrictions (using older models)  
* Exclusive use of highly-tested technologies  
* Intelligence limitations that make behavior predictable

I think some potential names for these systems could be:

* **Strongly** Bounded AI  
* Highly-Reliable AI  
* Boring AI`;

    const slateText = `This concept isn't just about alignment. It's also about:

Substantial capability restrictions (using older models)
Exclusive use of highly-tested technologies
Intelligence limitations that make behavior predictable

I think some potential names for these systems could be:

Strongly Bounded AI
Highly-Reliable AI
Boring AI`;

    const { result } = renderHook(() =>
      useHighlightMapper(markdown, slateText)
    );
    const { mdToSlateOffset, debug } = result.current;

    // Helper function to find positions in strings
    const findMarkdownPosition = (text: string) => {
      const mdIndex = markdown.indexOf(text);
      expect(mdIndex).not.toBe(-1); // Ensure text exists in markdown
      return mdIndex;
    };

    const findSlatePosition = (text: string) => {
      const slateIndex = slateText.indexOf(text);
      expect(slateIndex).not.toBe(-1); // Ensure text exists in slate
      return slateIndex;
    };

    // Test list item mapping
    const firstListItem = "Substantial capability restrictions";
    const mdListItemPos = findMarkdownPosition(firstListItem);
    const slateListItemPos = findSlatePosition(firstListItem);

    // The first bullet point should map correctly despite markdown formatting
    expect(mdToSlateOffset.get(mdListItemPos)).toBe(slateListItemPos);

    // Test bold text mapping
    const boldText = "Strongly";
    const mdBoldPos = markdown.indexOf("**" + boldText) + 2; // Position of 'S' after **
    const slateBoldPos = findSlatePosition(boldText);

    expect(mdToSlateOffset.get(mdBoldPos)).toBe(slateBoldPos);
  });

  it("should handle links in markdown", () => {
    const markdown =
      "Check out this [important link](https://example.com) for more details.";
    const slateText = "Check out this important link for more details.";

    const { result } = renderHook(() =>
      useHighlightMapper(markdown, slateText)
    );
    const { mdToSlateOffset } = result.current;

    // Position of 'i' in "important"
    const mdLinkTextStart = markdown.indexOf("[important");
    expect(mdToSlateOffset.get(mdLinkTextStart + 1)).toBe(
      markdown.indexOf("important") - 8
    );

    // Position of 't' in "details"
    const mdDetailsPos = markdown.indexOf("details");
    const slateDetailsPos = slateText.indexOf("details");
    expect(mdToSlateOffset.get(mdDetailsPos)).toBe(slateDetailsPos);
  });
});
