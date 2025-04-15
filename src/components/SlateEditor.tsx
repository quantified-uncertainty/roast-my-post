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
    case "heading":
      switch (element.depth) {
        case 1:
          return (
            <h1 {...attributes} className="text-4xl font-bold mb-4">
              {children}
            </h1>
          );
        case 2:
          return (
            <h2 {...attributes} className="text-3xl font-bold mb-3">
              {children}
            </h2>
          );
        case 3:
          return (
            <h3 {...attributes} className="text-2xl font-bold mb-2">
              {children}
            </h3>
          );
        default:
          return (
            <h4 {...attributes} className="text-xl font-bold mb-2">
              {children}
            </h4>
          );
      }
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
        <ol {...attributes} className="list-decimal ml-6 mb-4">
          {children}
        </ol>
      ) : (
        <ul {...attributes} className="list-disc ml-6 mb-4">
          {children}
        </ul>
      );
    case "list-item":
      return <li {...attributes}>{children}</li>;
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
  const [originalText, setOriginalText] = useState("");

  // Convert markdown to Slate nodes using remark-slate-transformer
  const value = useMemo(() => {
    const processor = unified().use(remarkParse).use(remarkToSlate);
    const result = processor.processSync(content);
    return result.result as Descendant[];
  }, [content]);

  // Initialize editor
  useEffect(() => {
    if (!initRef.current && value) {
      editor.children = value;
      editor.onChange();

      // Store the original text for offset mapping
      setOriginalText(content);

      initRef.current = true;
      setInitialized(true);
    }
  }, [editor, value, content]);

  // Get text from nodes
  const getNodeText = useCallback((node: Node): string => {
    if (Text.isText(node)) {
      return node.text;
    } else {
      return node.children.map(getNodeText).join("");
    }
  }, []);

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

      for (const highlight of highlights) {
        if (!highlight?.startOffset || !highlight?.endOffset) {
          continue;
        }

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
      }

      return ranges;
    },
    [highlights, activeTag, initialized, editor]
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
