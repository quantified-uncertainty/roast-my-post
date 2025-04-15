import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import remarkGfm from "remark-gfm";
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
  // Create a new set of attributes to avoid modifying the original
  const leafAttributes = { ...attributes };

  let el = children;

  // Apply formatting in a specific order to handle nested formatting
  if (leaf.code) {
    el = <code className="bg-gray-100 rounded px-1">{el}</code>;
  }

  if (leaf.emphasis || leaf.italic) {
    el = <em style={{ fontStyle: "italic" }}>{el}</em>;
  }

  if (leaf.strong || leaf.bold) {
    el = <strong style={{ fontWeight: "bold" }}>{el}</strong>;
  }

  if (leaf.highlight) {
    el = (
      <span
        data-tag={leaf.tag}
        className={`rounded bg-${leaf.color} ${
          leaf.tag === leafAttributes.activeTag ? "ring-2 ring-blue-500" : ""
        }`}
        onClick={(e) => {
          e.preventDefault();
          leafAttributes.onHighlightClick?.(leaf.tag);
        }}
        onMouseEnter={(e) => {
          e.preventDefault();
          leafAttributes.onHighlightHover?.(leaf.tag);
        }}
        onMouseLeave={(e) => {
          e.preventDefault();
          leafAttributes.onHighlightHover?.(null);
        }}
      >
        {el}
      </span>
    );
  }

  return <span {...leafAttributes}>{el}</span>;
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
    try {
      // Test the markdown parsing directly on a small sample
      const testMarkdown = "**Bold text** and _italic text_";
      console.log("Test markdown for formatting:", testMarkdown);

      const testProcessor = unified()
        .use(remarkParse)
        .use(remarkGfm)
        .use(remarkToSlate as any);

      const testResult = testProcessor.processSync(testMarkdown);
      console.log(
        "Processed test markdown:",
        JSON.stringify(testResult.result, null, 2)
      );

      // Proceed with the main content processing
      const processor = unified()
        .use(remarkParse)
        .use(remarkGfm) // Add GitHub-Flavored Markdown support
        .use(remarkToSlate as any, {
          // Note: These custom transformers ensure proper handling of markdown formatting
          nodeTypes: {
            emphasis: "emphasis",
            strong: "strong",
            inlineCode: "code",
            link: "link",
          },
        });

      // Process the markdown content
      const result = processor.processSync(content);
      let nodes = result.result as Descendant[];

      // Log the raw nodes for debugging
      console.log("Raw Markdown nodes:", JSON.stringify(nodes, null, 2));

      // Apply a custom processor specifically for formatting
      const processNode = (node: any): any => {
        // Special debug for node types we're most interested in
        if (node?.type === "emphasis" || node?.type === "strong") {
          console.log(
            `Processing ${node.type} node:`,
            JSON.stringify(node, null, 2)
          );
        }

        // Handle leaf text nodes
        if (typeof node?.text === "string") {
          return node;
        }

        // Process the node based on its type
        switch (node?.type) {
          case "emphasis":
            return {
              type: "paragraph", // Convert to paragraph to maintain structure
              children: node.children.map((child: any) => {
                if (typeof child.text === "string") {
                  return { text: child.text, italic: true };
                }
                // For nested nodes, preserve their formatting but add italic
                const processedChild = processNode(child);
                // Ensure italic is applied to all child elements' text nodes
                if (Array.isArray(processedChild.children)) {
                  return {
                    ...processedChild,
                    children: processedChild.children.map((textNode: any) => ({
                      ...textNode,
                      italic: true,
                    })),
                  };
                }
                return { ...processedChild, italic: true };
              }),
            };

          case "strong":
            return {
              type: "paragraph", // Convert to paragraph to maintain structure
              children: node.children.map((child: any) => {
                if (typeof child.text === "string") {
                  return { text: child.text, bold: true };
                }
                // For nested nodes, preserve their formatting but add bold
                const processedChild = processNode(child);
                // Ensure bold is applied to all child elements' text nodes
                if (Array.isArray(processedChild.children)) {
                  return {
                    ...processedChild,
                    children: processedChild.children.map((textNode: any) => ({
                      ...textNode,
                      bold: true,
                    })),
                  };
                }
                return { ...processedChild, bold: true };
              }),
            };

          case "heading":
            return {
              ...node,
              type: `heading-${
                ["one", "two", "three", "four", "five", "six"][
                  node.depth - 1
                ] || "one"
              }`,
              children: node.children.map(processNode),
            };

          case "list":
            return {
              ...node,
              type: "list",
              ordered: node.ordered === true,
              children: node.children.map(processNode),
            };

          case "listItem":
            return {
              ...node,
              type: "list-item",
              children: node.children.map(processNode),
            };

          case "link":
            return {
              ...node,
              type: "link",
              url: node.url,
              children: node.children.map(processNode),
            };

          default:
            // Process any children of other node types
            if (Array.isArray(node?.children)) {
              return {
                ...node,
                children: node.children.map(processNode),
              };
            }
            return node;
        }
      };

      // Process all nodes in the tree
      nodes = nodes.map(processNode);

      console.log("Processed nodes:", JSON.stringify(nodes, null, 2));
      return nodes as Descendant[];
    } catch (error) {
      console.error("Error parsing markdown:", error);
      // Return a simple default node if parsing fails
      return [
        {
          type: "paragraph",
          children: [{ text: content }],
          // Add empty properties that might be expected by the type system
          url: undefined,
        },
      ] as unknown as Descendant[];
    }
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
        let slateStartOffset = mdToSlateOffset.get(highlight.startOffset);
        let slateEndOffset = mdToSlateOffset.get(highlight.endOffset);

        // If direct mapping fails, try nearby offsets (more robust approach)
        if (slateStartOffset === undefined) {
          // Look for nearby offsets within a reasonable window (5 chars)
          for (let i = 1; i <= 5; i++) {
            if (mdToSlateOffset.get(highlight.startOffset - i) !== undefined) {
              slateStartOffset = mdToSlateOffset.get(highlight.startOffset - i);
              break;
            }
            if (mdToSlateOffset.get(highlight.startOffset + i) !== undefined) {
              slateStartOffset = mdToSlateOffset.get(highlight.startOffset + i);
              break;
            }
          }
        }

        if (slateEndOffset === undefined) {
          // Look for nearby offsets within a reasonable window (5 chars)
          for (let i = 1; i <= 5; i++) {
            if (mdToSlateOffset.get(highlight.endOffset - i) !== undefined) {
              slateEndOffset = mdToSlateOffset.get(highlight.endOffset - i);
              break;
            }
            if (mdToSlateOffset.get(highlight.endOffset + i) !== undefined) {
              slateEndOffset = mdToSlateOffset.get(highlight.endOffset + i);
              break;
            }
          }
        }

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
            // Remove markdown formatting
            const normalizedHighlightText = highlightText
              .replace(/\*\*/g, "") // Remove bold markers
              .replace(/\*/g, "") // Remove single asterisk italic markers
              .replace(/\_/g, "") // Remove underscore italic markers
              .replace(/\\\\/g, "\\") // Handle escaped backslashes
              .replace(/\\([^\\])/g, "$1") // Handle other escaped characters
              .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // Replace links with just their text
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

          // 3. Try with partial text matching (if still not found)
          if (!found && highlightText && nodeText) {
            // Extract the first sentence or chunk to try matching part of it
            const firstChunk = normalizeText(highlightText.split("\n")[0]);

            if (
              firstChunk &&
              firstChunk.length > 10 &&
              nodeText.includes(firstChunk)
            ) {
              const start = nodeText.indexOf(firstChunk);
              const end = start + firstChunk.length;

              ranges.push({
                anchor: { path, offset: start },
                focus: { path, offset: end },
                highlight: true,
                tag: highlight.tag || "",
                color: highlight.color || "yellow-200",
                isActive: highlight.tag === activeTag,
              });
              found = true;
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

  // Helper function to normalize text by removing markdown formatting
  const normalizeText = (text: string): string => {
    return text
      .replace(/\*\*/g, "") // Remove bold markers
      .replace(/\*/g, "") // Remove single asterisk italic markers
      .replace(/\_/g, "") // Remove underscore italic markers
      .replace(/\\\\/g, "\\") // Handle escaped backslashes
      .replace(/\\([^\\])/g, "$1") // Handle other escaped characters
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // Replace links with just their text
      .trim();
  };

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
        className="prose prose-slate prose-lg max-w-none [&_strong]:font-bold [&_em]:italic"
      />
    </Slate>
  );
};

export default SlateEditor;
