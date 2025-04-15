import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import remarkParse from 'remark-parse';
import remarkSlate from 'remark-slate';
import {
  BaseEditor,
  createEditor,
  Descendant,
  Element,
  Node,
  Text,
} from 'slate';
import {
  HistoryEditor,
  withHistory,
} from 'slate-history';
import {
  Editable,
  ReactEditor,
  Slate,
  withReact,
} from 'slate-react';
import { unified } from 'unified';

type CustomElement = {
  type:
    | "paragraph"
    | "heading-one"
    | "heading-two"
    | "heading-three"
    | "block-quote"
    | "bulleted-list"
    | "numbered-list"
    | "list-item";
  children: CustomText[];
  level?: number;
};

type CustomText = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  code?: boolean;
};

declare module "slate" {
  interface CustomTypes {
    Editor: BaseEditor & ReactEditor & HistoryEditor;
    Element: CustomElement;
    Text: CustomText;
  }
}

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

const renderElement = (props: any) => {
  const { attributes, children, element } = props;

  switch (element.type) {
    case "heading-one":
      return (
        <h1 {...attributes} className="text-4xl font-bold mb-4">
          {children}
        </h1>
      );
    case "heading-two":
      return (
        <h2 {...attributes} className="text-3xl font-bold mb-3">
          {children}
        </h2>
      );
    case "heading-three":
      return (
        <h3 {...attributes} className="text-2xl font-bold mb-2">
          {children}
        </h3>
      );
    case "block-quote":
      return (
        <blockquote
          {...attributes}
          className="border-l-4 border-gray-300 pl-4 italic"
        >
          {children}
        </blockquote>
      );
    case "bulleted-list":
      return (
        <ul {...attributes} className="list-disc ml-6">
          {children}
        </ul>
      );
    case "numbered-list":
      return (
        <ol {...attributes} className="list-decimal ml-6">
          {children}
        </ol>
      );
    case "list-item":
      return <li {...attributes}>{children}</li>;
    default:
      return (
        <div {...attributes} className="mb-4">
          {children}
        </div>
      );
  }
};

const renderLeaf = (props: any) => {
  const { attributes, children, leaf } = props;
  let element = children;

  if (leaf.bold) {
    element = <strong>{element}</strong>;
  }
  if (leaf.italic) {
    element = <em>{element}</em>;
  }
  if (leaf.code) {
    element = <code className="bg-gray-100 rounded px-1">{element}</code>;
  }
  if (leaf.highlight) {
    element = (
      <span
        data-tag={leaf.tag}
        className={`rounded bg-${leaf.color} ${
          leaf.tag === props.activeTag ? "ring-2 ring-blue-500" : ""
        }`}
        onClick={(e) => {
          e.preventDefault();
          props.onHighlightClick?.(leaf.tag);
        }}
        onMouseEnter={(e) => {
          e.preventDefault();
          props.onHighlightHover?.(leaf.tag);
        }}
        onMouseLeave={(e) => {
          e.preventDefault();
          props.onHighlightHover?.(null);
        }}
      >
        {element}
      </span>
    );
  }

  return <span {...attributes}>{element}</span>;
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

  // Convert markdown to Slate nodes
  const value = useMemo(() => {
    const processor = unified().use(remarkParse).use(remarkSlate);
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
        if (
          typeof highlight?.startOffset !== "number" ||
          typeof highlight?.endOffset !== "number"
        ) {
          continue;
        }

        // Try to find this node in the content
        const text = node.text;
        if (!text) continue;

        // Check if this highlight might overlap with this text node
        // Use the original text offset to determine if we should highlight
        const nodeStart = originalText.indexOf(text);
        if (nodeStart === -1) continue;

        const nodeEnd = nodeStart + text.length;

        // Skip if this node is completely outside the highlight range
        if (
          nodeEnd <= highlight.startOffset ||
          nodeStart >= highlight.endOffset
        ) {
          continue;
        }

        // Calculate local offsets within this node
        const localStart = Math.max(0, highlight.startOffset - nodeStart);
        const localEnd = Math.min(text.length, highlight.endOffset - nodeStart);

        // Only add a highlight if it actually covers part of this text node
        if (localStart < localEnd) {
          ranges.push({
            anchor: { path, offset: localStart },
            focus: { path, offset: localEnd },
            highlight: true,
            tag: highlight.tag || "",
            color: highlight.color || "yellow-200",
            isActive: highlight.tag === activeTag,
          });
        }
      }

      return ranges;
    },
    [highlights, activeTag, originalText, initialized]
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
