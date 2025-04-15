import { useMemo } from 'react';

import {
  Editor,
  Path,
  Text,
} from 'slate';

// Define the structure of the offset information we store
interface NodeOffsetInfo {
  path: Path;
  start: number;
  end: number;
}

/**
 * A custom hook that calculates and caches the start and end offsets
 * of each text node within the editor's concatenated plain text content.
 *
 * @param editor The Slate editor instance.
 * @returns A Map where keys are path strings (e.g., "0.0") and values
 *          are objects containing the node's path, start, and end offset.
 */
export function usePlainTextOffsets(
  editor: Editor
): Map<string, NodeOffsetInfo> {
  const nodeOffsets = useMemo(() => {
    const index = new Map<string, NodeOffsetInfo>();
    let offset = 0;

    // Ensure we only iterate if editor.children exists and is valid
    if (!editor.children || !Array.isArray(editor.children)) {
      return index; // Return empty map if editor content is not ready
    }

    try {
      // Iterate over all text nodes in the editor
      for (const [node, path] of Editor.nodes(editor, {
        at: [], // Iterate over the entire document
        match: (n) => Text.isText(n),
        universal: true, // Ensure we traverse all levels
      })) {
        // Type guard to ensure node is Text
        if (Text.isText(node)) {
          const len = node.text.length;
          const pathKey = path.join(".");
          index.set(pathKey, { path, start: offset, end: offset + len });
          offset += len;
        }
      }
    } catch (error) {
      // Handle potential errors during iteration if editor state is invalid
      console.error("Error calculating text offsets:", error);
      // Depending on requirements, you might want to return an empty map
      // or let the error propagate if it's critical.
      return new Map<string, NodeOffsetInfo>();
    }

    return index;
    // Dependency: Recalculate when the editor's content changes.
    // JSON.stringify is a common way to trigger updates on deep changes,
    // but can be expensive. Consider a more efficient dependency if performance is critical.
  }, [JSON.stringify(editor.children)]);

  return nodeOffsets;
}
