import { useMemo } from "react";
import { logger } from "@/infrastructure/logging/logger";

import { Editor, Element, Node, Path, Text } from "slate";

// Define the structure of the offset information we store
interface NodeOffsetInfo {
  path: Path;
  start: number;
  end: number;
  text: string;
}

/**
 * A custom hook that calculates and caches the start and end offsets
 * of each text node within the editor's concatenated plain text content.
 *
 * Phase 2: More robust implementation with block handling and error prevention
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
      // Check if editor has content before using Editor.string
      if (!editor.children || editor.children.length === 0) {
        return index; // Return empty map if no content
      }

      // Traverse nodes to get individual node offsets
      const collectTextNodes = (node: Node, path: Path) => {
        if (Text.isText(node)) {
          // Add this text node to our index
          const start = offset;
          const text = node.text;
          const end = start + text.length;
          const pathKey = path.join(".");

          index.set(pathKey, { path, start, end, text });
          offset += text.length;
        } else if (Element.isElement(node)) {
          // Process children
          node.children.forEach((child, i) => {
            const childPath = [...path, i];
            collectTextNodes(child, childPath);
          });
        }
      };

      // Process each top-level node
      editor.children.forEach((child, i) => {
        collectTextNodes(child, [i]);
      });

      return index;
    } catch (error) {
      // Handle potential errors during iteration if editor state is invalid
      logger.error("Error calculating text offsets:", error);
      return new Map<string, NodeOffsetInfo>();
    }
  }, [editor.children]);

  return nodeOffsets;
}
