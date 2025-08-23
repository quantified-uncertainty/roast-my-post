import { useMemo } from "react";
import { Node, Text } from "slate";
import { BaseEditor } from "slate";

/**
 * Simple hook to calculate plain text offsets for each node in the editor.
 * This maps Slate node paths to their start/end positions in the plain text.
 */
export function useSimplePlainTextOffsets(editor: BaseEditor) {
  return useMemo(() => {
    const offsets = new Map<string, { start: number; end: number }>();
    let currentOffset = 0;

    const traverse = (nodes: Node[], parentPath: number[] = []) => {
      nodes.forEach((node, index) => {
        const path = [...parentPath, index];
        const pathKey = path.join(".");

        if (Text.isText(node)) {
          offsets.set(pathKey, {
            start: currentOffset,
            end: currentOffset + node.text.length,
          });
          currentOffset += node.text.length;
        } else if (node.children) {
          traverse(node.children, path);
        }
      });
    };

    traverse(editor.children);
    return offsets;
  }, [editor.children]);
}