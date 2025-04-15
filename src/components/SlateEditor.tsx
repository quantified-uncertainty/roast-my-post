import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import remarkParse from "remark-parse";
import { remarkToSlate } from "remark-slate-transformer";
import { createEditor, Descendant, Element, Node, Text } from "slate";
import { withHistory } from "slate-history";
import { Editable, Slate, withReact } from "slate-react";
import { unified } from "unified";

// Import our improved hooks for Phase 2
import { useHighlightMapper } from "../hooks/useHighlightMapper";
import { usePlainTextOffsets } from "../hooks/usePlainTextOffsets";

interface Highlight {
  startOffset: number;
  endOffset: number;
  quotedText?: string;
  color: string;
  tag: string;
}

interface SlateEditorProps {
  content: string;
  highlights: Highlight[];
  onHighlightClick?: (tag: string) => void;
  onHighlightHover?: (tag: string | null) => void;
  activeTag?: string | null;
}

const renderElement = ({ attributes, children, element }: any) => {
  switch (element.type) {
    case "heading-one":
      return (
        <h1 {...attributes} className="text-4xl font-bold mb-6">
          {children}
        </h1>
      );
    case "heading-two":
      return (
        <h2 {...attributes} className="text-3xl font-bold mb-5">
          {children}
        </h2>
      );
    case "heading-three":
      return (
        <h3 {...attributes} className="text-2xl font-bold mb-4">
          {children}
        </h3>
      );
    case "heading-four":
      return (
        <h4 {...attributes} className="text-xl font-bold mb-3">
          {children}
        </h4>
      );
    case "heading-five":
      return (
        <h5 {...attributes} className="text-lg font-bold mb-3">
          {children}
        </h5>
      );
    case "heading-six":
      return (
        <h6 {...attributes} className="text-base font-bold mb-3">
          {children}
        </h6>
      );
    case "paragraph":
      return (
        <p {...attributes} className="mb-4">
          {children}
        </p>
      );
    case "block-quote":
      return (
        <blockquote
          {...attributes}
          className="border-l-4 border-gray-300 pl-4 italic mb-4"
        >
          {children}
        </blockquote>
      );
    case "list":
      return element.ordered ? (
        <ol {...attributes} className="list-decimal pl-5 my-2">
          {children}
        </ol>
      ) : (
        <ul {...attributes} className="list-disc pl-5 my-2">
          {children}
        </ul>
      );
    case "list-item":
      return (
        <li {...attributes} className="my-1">
          <div className="pl-1">{children}</div>
        </li>
      );
    case "link":
      return (
        <a
          {...attributes}
          href={element.url}
          className="text-blue-600 hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          {children}
        </a>
      );
    default:
      return (
        <span {...attributes} className="mb-4 inline-block">
          {children}
        </span>
      );
  }
};

const renderLeaf = ({ attributes, children, leaf }: any) => {
  let el = children;

  if (leaf.bold) {
    el = <strong>{el}</strong>;
  }
  if (leaf.italic) {
    el = <em>{el}</em>;
  }
  if (leaf.code) {
    el = <code className="bg-gray-100 rounded px-1">{el}</code>;
  }
  if (leaf.highlight) {
    el = (
      <span
        data-tag={leaf.tag}
        className={`rounded bg-${leaf.color} ${
          leaf.tag === attributes.activeTag ? "ring-2 ring-blue-500" : ""
        }`}
        onClick={(e) => {
          e.preventDefault();
          attributes.onHighlightClick?.(leaf.tag);
        }}
        onMouseEnter={(e) => {
          e.preventDefault();
          attributes.onHighlightHover?.(leaf.tag);
        }}
        onMouseLeave={(e) => {
          e.preventDefault();
          attributes.onHighlightHover?.(null);
        }}
      >
        {el}
      </span>
    );
  }

  return <span {...attributes}>{el}</span>;
};

/**
 * SlateEditor component displays markdown content with highlighted sections.
 *
 * Phase 2: Using diff-match-patch for robust offset mapping
 */
const SlateEditor: React.FC<SlateEditorProps> = ({
  content,
  highlights,
  onHighlightClick,
  onHighlightHover,
  activeTag,
}) => {
  const editor = useMemo(() => withHistory(withReact(createEditor())), []);
  const [initialized, setInitialized] = useState(false);
  const initRef = useRef(false);
  const [slateText, setSlateText] = useState("");

  // Convert markdown to Slate nodes using remark-slate-transformer
  const value = useMemo(() => {
    const processor = unified()
      .use(remarkParse, {
        commonmark: true,
        gfm: true,
      })
      .use(remarkToSlate);

    const result = processor.processSync(content);
    const nodes = result.result as Descendant[];

    // Transform heading nodes to match our expected format
    const transformNode = (node: any): any => {
      if (node.type === "heading") {
        return {
          ...node,
          type: `heading-${
            ["one", "two", "three", "four", "five", "six"][node.depth - 1] ||
            "one"
          }`,
        };
      }
      // Handle lists specifically
      if (node.type === "list") {
        return {
          ...node,
          type: "list",
          ordered: node.ordered === true,
          children: node.children.map(transformNode),
        };
      }
      if (node.type === "listItem") {
        return {
          ...node,
          type: "list-item",
          children: node.children.map(transformNode),
        };
      }
      if (Array.isArray(node.children)) {
        return {
          ...node,
          children: node.children.map(transformNode),
        };
      }
      return node;
    };

    const transformedNodes = nodes.map(transformNode);
    return transformedNodes;
  }, [content]);

  // Extract plain text from nodes
  const extractPlainText = useCallback((nodes: Node[]): string => {
    let text = "";

    const visit = (node: Node) => {
      if (Text.isText(node)) {
        text += node.text;
      } else if (Element.isElement(node)) {
        // Handle block elements structure for better matching with markdown
        if (
          node.type &&
          (node.type.startsWith("heading") ||
            node.type === "paragraph" ||
            node.type === "block-quote")
        ) {
          // Add paragraph breaks for these block types
          if (text.length > 0 && !text.endsWith("\n\n")) {
            text += "\n\n";
          }
        }

        // Visit all children
        node.children.forEach(visit);

        // Add trailing breaks for block elements
        if (
          node.type &&
          (node.type.startsWith("heading") ||
            node.type === "paragraph" ||
            node.type === "block-quote")
        ) {
          if (!text.endsWith("\n\n")) {
            text += "\n\n";
          }
        }
      }
    };

    nodes.forEach(visit);
    return text;
  }, []);

  // Initialize editor
  useEffect(() => {
    if (!initRef.current && value) {
      editor.children = value;
      editor.onChange();

      // Extract plain text for offset mapping
      const plainText = extractPlainText(editor.children);
      setSlateText(plainText);

      initRef.current = true;
      setInitialized(true);
    }
  }, [editor, value, content, extractPlainText]);

  // Use our custom hooks for robust offset mapping
  const { mdToSlateOffset } = useHighlightMapper(content, slateText);
  const nodeOffsets = usePlainTextOffsets(editor);

  // Decorate function to add highlights using our improved offset mapping
  const decorate = useCallback(
    ([node, path]: [Node, number[]]) => {
      if (!Text.isText(node) || !initialized) {
        return [];
      }

      const ranges: any[] = [];
      const pathKey = path.join(".");
      const nodeInfo = nodeOffsets.get(pathKey);

      if (!nodeInfo) return [];

      for (const highlight of highlights) {
        if (
          highlight?.startOffset === undefined ||
          highlight?.endOffset === undefined ||
          highlight?.startOffset < 0 ||
          highlight?.endOffset <= highlight?.startOffset
        ) {
          continue; // Skip invalid highlights
        }

        // Map markdown offsets to slate offsets using diff-match-patch
        const slateStartOffset = mdToSlateOffset.get(highlight.startOffset);
        const slateEndOffset = mdToSlateOffset.get(highlight.endOffset);

        if (slateStartOffset === undefined || slateEndOffset === undefined) {
          // Fall back to original approach if mapping doesn't exist
          // Check if the current text node contains text from the highlight
          // Since we can't rely on precise mapping, we'll use a more basic approach
          const nodeText = node.text;
          let highlightText = highlight.quotedText || "";

          // Try various transformations of the highlight text to improve matching
          let found = false;

          // 1. Try direct match
          if (nodeText && highlightText && nodeText.includes(highlightText)) {
            found = true;
            const start = nodeText.indexOf(highlightText);
            const end = start + highlightText.length;

            ranges.push({
              anchor: { path, offset: start },
              focus: { path, offset: end },
              highlight: true,
              tag: highlight.tag || "",
              color: highlight.color || "yellow-200",
              isActive: highlight.tag === activeTag,
            });
          }

          // 2. Try without markdown formatting (if not found)
          if (!found) {
            const normalizedHighlightText = highlightText
              .replace(/\*\*/g, "") // Remove bold markers
              .replace(/\\\\/g, "\\") // Handle escaped backslashes
              .replace(/\\([^\\])/g, "$1") // Handle other escaped characters
              .trim();

            if (
              nodeText &&
              normalizedHighlightText &&
              nodeText.includes(normalizedHighlightText)
            ) {
              const start = nodeText.indexOf(normalizedHighlightText);
              const end = start + normalizedHighlightText.length;

              ranges.push({
                anchor: { path, offset: start },
                focus: { path, offset: end },
                highlight: true,
                tag: highlight.tag || "",
                color: highlight.color || "yellow-200",
                isActive: highlight.tag === activeTag,
              });
            }
          }

          continue;
        }

        // Check if this node overlaps with the highlight
        const nodeStartOffset = nodeInfo.start;
        const nodeEndOffset = nodeInfo.end;

        if (
          slateEndOffset > nodeStartOffset &&
          slateStartOffset < nodeEndOffset
        ) {
          // Calculate the local offsets within this text node
          const highlightStart = Math.max(
            0,
            slateStartOffset - nodeStartOffset
          );
          const highlightEnd = Math.min(
            node.text.length,
            slateEndOffset - nodeStartOffset
          );

          if (highlightStart < highlightEnd) {
            ranges.push({
              anchor: { path, offset: highlightStart },
              focus: { path, offset: highlightEnd },
              highlight: true,
              tag: highlight.tag || "",
              color: highlight.color || "yellow-200",
              isActive: highlight.tag === activeTag,
            });
          }
        }
      }

      return ranges;
    },
    [highlights, activeTag, initialized, editor, nodeOffsets, mdToSlateOffset]
  );

  if (!initialized) {
    return <div>Loading...</div>;
  }

  return (
    <Slate editor={editor} initialValue={value}>
      <Editable
        data-testid="slate-editable"
        decorate={decorate}
        renderElement={renderElement}
        renderLeaf={(props) =>
          renderLeaf({
            ...props,
            activeTag,
            onHighlightClick,
            onHighlightHover,
          })
        }
        readOnly
        className="prose prose-slate prose-lg max-w-none"
      />
    </Slate>
  );
};

export default SlateEditor;
