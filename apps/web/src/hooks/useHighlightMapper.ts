import { useMemo } from "react";

// Import diff-match-patch for Phase 2
import DiffMatchPatch, { Diff } from "diff-match-patch";

/**
 * A hook to map between markdown and slate text offsets
 *
 * Phase 2: Using diff-match-patch for robust offset mapping
 */
export function useHighlightMapper(markdown: string, slateText: string) {
  return useMemo(() => {
    // Phase 2: Use diff-match-patch for robust offset mapping
    const dmp = new DiffMatchPatch();
    const diffs = dmp.diff_main(markdown, slateText);

    // Apply semantic cleanup to get more meaningful diffs
    dmp.diff_cleanupSemantic(diffs);

    const mdToSlateOffset = new Map<number, number>();
    const slateToMdOffset = new Map<number, number>();

    let mdOffset = 0;
    let slateOffset = 0;

    // Process the diffs to build offset maps
    diffs.forEach((diff: Diff) => {
      const [op, text] = diff;

      switch (op) {
        case DiffMatchPatch.DIFF_EQUAL:
          // For matching text, create a 1:1 mapping
          for (let i = 0; i < text.length; i++) {
            mdToSlateOffset.set(mdOffset, slateOffset);
            slateToMdOffset.set(slateOffset, mdOffset);
            mdOffset++;
            slateOffset++;
          }
          break;

        case DiffMatchPatch.DIFF_DELETE:
          // Text only in markdown - advance the markdown offset
          mdOffset += text.length;
          break;

        case DiffMatchPatch.DIFF_INSERT:
          // Text only in slate - advance the slate offset
          slateOffset += text.length;
          break;
      }
    });

    // Handle end-of-content mappings
    if (!mdToSlateOffset.has(markdown.length) && slateText.length > 0) {
      mdToSlateOffset.set(markdown.length, slateText.length);
    }
    if (!slateToMdOffset.has(slateText.length) && markdown.length > 0) {
      slateToMdOffset.set(slateText.length, markdown.length);
    }

    return {
      mdToSlateOffset,
      slateToMdOffset,
      // Return diffs for debugging
      debug: { diffs, markdown, slateText },
    };
  }, [markdown, slateText]);
}
