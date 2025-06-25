import { useMemo } from "react";
import { logger } from "@/lib/logger";

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
    let plainText = "";

    // Ensure we only iterate if editor.children exists and is valid
    if (!editor.children || !Array.isArray(editor.children)) {
      return index; // Return empty map if editor content is not ready
    }

    try {
      // More careful traversal of the editor's node tree
      const collectTextNodes = (node: Node, path: Path) => {
        if (Text.isText(node)) {
          // Add this text node to our index
          const start = offset;
          const text = node.text;
          const end = start + text.length;
          const pathKey = path.join(".");

          // Add debugging for the problematic range
          if (
            (start <= 70 && end >= 60) || // Range overlaps with 60-70
            (offset >= 50 && offset <= 80) // Nearby offsets for context
          ) {
            console.log(
              `Node with offset ${start}-${end} at path ${pathKey}:`,
              {
                text,
                offset,
                plainText: plainText.substring(
                  Math.max(0, plainText.length - 10)
                ),
              }
            );
          }

          index.set(pathKey, { path, start, end, text });
          plainText += text;
          offset += text.length;
        } else if (Element.isElement(node)) {
          // Add paragraph breaks for block elements to better match markdown structure
          if (
            Element.isElement(node) &&
            node.type &&
            (node.type.startsWith("heading") ||
              node.type === "paragraph" ||
              node.type === "block-quote")
          ) {
            // Only add breaks if we're not at the beginning
            if (plainText.length > 0 && !plainText.endsWith("\n\n")) {
              // Debug the newline addition
              const oldOffset = offset;
              plainText += "\n\n";
              offset += 2; // Account for the added newlines

              // Log if this affects our problematic range
              if (oldOffset <= 70 && offset >= 60) {
                console.log(
                  `Added newlines at offset ${oldOffset}, new offset: ${offset}`
                );
              }
            }
          }

          // Process children
          node.children.forEach((child, i) => {
            // Create proper path for this child
            const childPath = [...path, i];
            collectTextNodes(child, childPath);
          });

          // Add a block separator after certain elements
          if (
            Element.isElement(node) &&
            node.type &&
            (node.type.startsWith("heading") ||
              node.type === "paragraph" ||
              node.type === "block-quote")
          ) {
            if (!plainText.endsWith("\n\n")) {
              plainText += "\n\n";
              offset += 2;
            }
          }
        }
      };

      // Process each top-level node
      editor.children.forEach((child, i) => {
        collectTextNodes(child, [i]);
      });

      // Return the populated index
      return index;
    } catch (error) {
      // Handle potential errors during iteration if editor state is invalid
      logger.error('Error calculating text offsets:', error);
      return new Map<string, NodeOffsetInfo>();
    }
  }, [editor.children]);

  return nodeOffsets;
}
