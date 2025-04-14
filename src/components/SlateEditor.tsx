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
  Editor,
  Element,
  Node,
  Text,
  Transforms,
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

interface TextNodePosition {
  text: string;
  path: number[];
  startOffset: number;
  endOffset: number;
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
  const [initialized, setInitialized] = useState(false);
  const initRef = useRef(false);

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
      initRef.current = true;
      setInitialized(true);
    }
  }, [editor, value]);

  // Build a map of text positions
  const flatIndex = useMemo(() => {
    const positions = new Map<string, TextNodePosition>();

    if (!initialized) {
      console.log("Editor not initialized yet");
      return positions;
    }

    let offset = 0;
    try {
      // Force a selection to ensure editor is ready
      Transforms.select(editor, { path: [0, 0], offset: 0 });

      // Get all text nodes and their paths
      const nodes = Array.from(
        Editor.nodes(editor, {
          at: [],
          match: Text.isText,
        })
      );

      console.log(
        "Found nodes:",
        nodes.length,
        nodes.map(([n, p]) => ({ text: n.text, path: p.join(".") }))
      );

      // Build position map
      nodes.forEach(([node, path]) => {
        if (!Text.isText(node)) return;

        // Add block break space if needed
        const parent = Node.parent(editor, path);
        if (
          Element.isElement(parent) &&
          Editor.isBlock(editor, parent) &&
          positions.size > 0
        ) {
          offset += 1;
        }

        const position: TextNodePosition = {
          text: node.text,
          path,
          startOffset: offset,
          endOffset: offset + node.text.length,
        };

        positions.set(path.join("."), position);
        offset += node.text.length;
      });

      console.log("Position map built:", {
        size: positions.size,
        paths: Array.from(positions.keys()),
        totalLength: offset,
        positions: Array.from(positions.values()).map((p) => ({
          path: p.path.join("."),
          text: p.text.slice(0, 30),
          start: p.startOffset,
          end: p.endOffset,
        })),
      });
    } catch (error) {
      console.error("Error building position map:", error);
    }

    return positions;
  }, [editor, initialized]);

  // Decorate function to add highlights
  const decorate = useCallback(
    ([node, path]: [Node, number[]]) => {
      if (!Text.isText(node) || !initialized) {
        return [];
      }

      const ranges: any[] = [];
      const pathKey = path.join(".");
      const nodePosition = flatIndex.get(pathKey);

      if (!nodePosition) {
        console.log("Node position not found:", pathKey, flatIndex.size);
        return ranges;
      }

      console.log(`Processing node at path ${pathKey}:`, {
        nodeText: node.text,
        position: nodePosition,
      });

      for (const highlight of highlights) {
        if (
          typeof highlight?.startOffset !== "number" ||
          typeof highlight?.endOffset !== "number"
        ) {
          console.log("Skipping invalid highlight:", highlight);
          continue;
        }

        console.log(`Checking highlight:`, {
          highlight,
          nodeStart: nodePosition.startOffset,
          nodeEnd: nodePosition.endOffset,
          nodeText: nodePosition.text,
        });

        // Skip if this node is completely outside the highlight range
        if (
          nodePosition.endOffset < highlight.startOffset ||
          nodePosition.startOffset > highlight.endOffset
        ) {
          console.log("Node outside highlight range:", {
            path: pathKey,
            nodeRange: [nodePosition.startOffset, nodePosition.endOffset],
            highlightRange: [highlight.startOffset, highlight.endOffset],
          });
          continue;
        }

        // Calculate local offsets within this node
        const localStart = Math.max(
          0,
          highlight.startOffset - nodePosition.startOffset
        );
        const localEnd = Math.min(
          node.text.length,
          highlight.endOffset - nodePosition.startOffset
        );

        if (localStart < localEnd) {
          console.log("Adding highlight range:", {
            path: pathKey,
            localRange: [localStart, localEnd],
            highlightedText: node.text.slice(localStart, localEnd),
            highlight,
          });

          ranges.push({
            anchor: { path, offset: localStart },
            focus: { path, offset: localEnd },
            highlight: true,
            tag: highlight.tag || "",
            color: highlight.color || "#ffeb3b",
            isActive: highlight.tag === activeTag,
          });
        }
      }

      return ranges;
    },
    [highlights, activeTag, flatIndex, initialized]
  );

  if (!initialized) {
    return <div>Loading...</div>;
  }

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
