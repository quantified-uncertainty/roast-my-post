import React, {
  useCallback,
  useMemo,
} from 'react';

import remarkParse from 'remark-parse';
import remarkSlate from 'remark-slate';
import {
  BaseEditor,
  createEditor,
  Descendant,
  Editor,
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
        <p {...attributes} className="mb-4">
          {children}
        </p>
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
        {...attributes}
        data-tag={leaf.tag}
        className={`rounded bg-${leaf.color} ${
          leaf.isActive ? "ring-2 ring-blue-500" : ""
        }`}
        onClick={() => props.onHighlightClick?.(leaf.tag)}
        onMouseEnter={() => props.onHighlightHover?.(leaf.tag)}
        onMouseLeave={() => props.onHighlightHover?.(null)}
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

  // Convert markdown to Slate nodes
  const value = useMemo(() => {
    const processor = unified().use(remarkParse).use(remarkSlate);
    const result = processor.processSync(content);
    return result.result as Descendant[];
  }, [content]);

  // Decorate function to add highlights
  const decorate = useCallback(
    ([node, path]: [Node, number[]]) => {
      if (!Text.isText(node)) {
        return [];
      }

      const ranges: any[] = [];

      try {
        // Get all text nodes in document order
        const textPaths = Array.from(
          Editor.nodes(editor, {
            at: [],
            match: Text.isText,
          })
        );

        // Calculate the absolute offset for this node
        let absoluteOffset = 0;
        for (const [n, p] of textPaths) {
          if (p.toString() === path.toString()) {
            break;
          }
          if (Text.isText(n)) {
            absoluteOffset += n.text.length;
          }
          // Add extra space for block breaks
          const parent = Node.parent(editor, p);
          if (Element.isElement(parent) && Editor.isBlock(editor, parent)) {
            absoluteOffset += 1; // Account for newline
          }
        }

        console.log("Node position:", {
          path,
          text: node.text,
          absoluteOffset,
        });

        highlights.forEach((highlight) => {
          // Validate highlight object and required properties
          if (
            !highlight ||
            typeof highlight.startOffset !== "number" ||
            typeof highlight.endOffset !== "number"
          ) {
            return;
          }

          // Check if this highlight overlaps with our node
          const highlightStart = highlight.startOffset;
          const highlightEnd = highlight.endOffset;
          const nodeStart = absoluteOffset;
          const nodeEnd = absoluteOffset + node.text.length;

          if (highlightStart <= nodeEnd && highlightEnd >= nodeStart) {
            // Calculate the relative offsets within this node
            const start = Math.max(0, highlightStart - nodeStart);
            const end = Math.min(node.text.length, highlightEnd - nodeStart);

            if (start < end) {
              const highlightText = node.text.slice(start, end);
              let shouldHighlight = true;

              // If quotedText is provided, verify it matches
              if (highlight.quotedText) {
                const expectedTextStart = Math.max(
                  0,
                  nodeStart - highlightStart
                );
                const expectedText = highlight.quotedText.slice(
                  expectedTextStart,
                  expectedTextStart + (end - start)
                );
                shouldHighlight = highlightText === expectedText;
              }

              if (shouldHighlight) {
                ranges.push({
                  anchor: { path, offset: start },
                  focus: { path, offset: end },
                  highlight: true,
                  tag: highlight.tag || "",
                  color: highlight.color || "#ffeb3b",
                  isActive: highlight.tag === activeTag,
                });
              }
            }
          }
        });
      } catch (error) {
        console.error("Error in decorate:", error);
      }

      return ranges;
    },
    [highlights, activeTag, editor]
  );

  return (
    <Slate editor={editor} initialValue={value}>
      <Editable
        decorate={decorate}
        renderElement={renderElement}
        renderLeaf={renderLeaf}
        readOnly
        className="prose prose-slate prose-lg max-w-none"
      />
    </Slate>
  );
};

export default SlateEditor;
