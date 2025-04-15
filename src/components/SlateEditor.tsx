import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import remarkParse from 'remark-parse';
import { remarkToSlate } from 'remark-slate-transformer';
import {
  createEditor,
  Descendant,
  Editor,
  Element,
  Node,
  Text,
} from 'slate';
import { withHistory } from 'slate-history';
import {
  Editable,
  Slate,
  withReact,
} from 'slate-react';
import { unified } from 'unified';

// Import our custom hook (Phase 1 implementation)
import { useHighlightMapper } from '../hooks/useHighlightMapper';

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
        <div {...attributes} className="mb-4">
          {children}
        </div>
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
  const [renderedText, setRenderedText] = useState("");

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

  // Get text from nodes
  const getNodeText = useCallback((node: Node): string => {
    if (Text.isText(node)) {
      return node.text;
    } else {
      return node.children.map(getNodeText).join("");
    }
  }, []);

  // Extract rendered text for offset mapping
  const extractRenderedText = useCallback(() => {
    if (!editor.children || !Array.isArray(editor.children)) return "";
    
    let text = "";
    const extractText = (node: Node) => {
      if (Text.isText(node)) {
        text += node.text;
      } else if (Element.isElement(node)) {
        node.children.forEach(extractText);
        
        // Add paragraph breaks for block elements to better match markdown structure
        if (
          node.type &&
          (node.type.startsWith("heading") || node.type === "paragraph")
        ) {
          text += "\n\n";
        }
      }
    };
    
    editor.children.forEach(extractText);
    return text;
  }, [editor.children]);

  // Initialize editor
  useEffect(() => {
    if (!initRef.current && value) {
      editor.children = value;
      editor.onChange();

      // Extract rendered text for offset mapping
      const extracted = extractRenderedText();
      setRenderedText(extracted);

      initRef.current = true;
      setInitialized(true);
    }
  }, [editor, value, content, extractRenderedText]);

  // Use our custom offset mapper (Phase 1)
  const { mdToSlateOffset } = useHighlightMapper(content, renderedText);

  // Build node ranges for highlighting
  const nodeRanges = useMemo(() => {
    if (!initialized) return new Map();

    const ranges = new Map();
    let documentText = "";
    let nodeTexts: {
      node: Node;
      path: number[];
      start: number;
      end: number;
      text: string;
    }[] = [];

    // First pass: collect all text nodes and their content
    const collectTextNodes = (node: Node, path: number[]) => {
      if (Text.isText(node)) {
        const start = documentText.length;
        const text = node.text;
        const end = start + text.length;

        nodeTexts.push({ node, path, start, end, text });
        documentText += text;
      } else if (Element.isElement(node)) {
        // Add separators for block elements to match original markdown offsets
        if (
          node.type &&
          (node.type.startsWith("heading") || node.type === "paragraph")
        ) {
          if (documentText.length > 0 && !documentText.endsWith("\n\n")) {
            documentText += "\n\n";
          }
        }

        node.children.forEach((child, i) => {
          collectTextNodes(child, [...path, i]);
        });
      }
    };

    editor.children.forEach((node, i) => {
      collectTextNodes(node, [i]);
    });

    // Map original content offsets to our collected text
    nodeTexts.forEach(({ node, path, start, end, text }) => {
      ranges.set(path.join("."), { node, path, start, end, text });
    });

    return ranges;
  }, [editor, initialized]);

  // Decorate function to add highlights
  const decorate = useCallback(
    ([node, path]: [Node, number[]]) => {
      if (!Text.isText(node) || !initialized) {
        return [];
      }

      const ranges: any[] = [];
      const pathKey = path.join(".");
      const nodeInfo = nodeRanges.get(pathKey);
      
      if (!nodeInfo) return [];

      for (const highlight of highlights) {
        if (!highlight?.startOffset || !highlight?.endOffset) {
          continue;
        }

        // Phase 1: Map the markdown offsets to slate offsets using our mapper
        const slateStartOffset = mdToSlateOffset.get(highlight.startOffset);
        const slateEndOffset = mdToSlateOffset.get(highlight.endOffset);
        
        if (slateStartOffset === undefined || slateEndOffset === undefined) {
          // Fall back to the original approach if our mapping doesn't have this offset
          // Get the text content up to this node
          const nodeEntry = Editor.node(editor, path);
          const [, nodePath] = nodeEntry;
          const start = Editor.start(editor, []);
          const nodeStart = Editor.start(editor, nodePath);
          const startPoint = Editor.before(editor, nodeStart) || start;
          const beforeText = Editor.string(editor, {
            anchor: start,
            focus: startPoint,
          });

          const nodeStartOffset = beforeText.length;
          const nodeText = node.text;

          // Calculate if this highlight overlaps with this node
          const highlightStart = Math.max(
            0,
            highlight.startOffset - nodeStartOffset
          );
          const highlightEnd = Math.min(
            nodeText.length,
            highlight.endOffset - nodeStartOffset
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
        } else {
          // Use our mapped offsets
          // Calculate if this highlight overlaps with this node
          const nodeStartOffset = nodeInfo.start;
          const nodeEndOffset = nodeInfo.end;
          
          // Check if the highlight overlaps with this node
          if (slateEndOffset >= nodeStartOffset && slateStartOffset <= nodeEndOffset) {
            const highlightStart = Math.max(0, slateStartOffset - nodeStartOffset);
            const highlightEnd = Math.min(node.text.length, slateEndOffset - nodeStartOffset);

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
      }

      return ranges;
    },
    [highlights, activeTag, initialized, editor, nodeRanges, mdToSlateOffset]
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
