"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Image from "next/image";

import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { createEditor, Descendant, Element, Node, Text } from "slate";
import { withHistory } from "slate-history";
import { Editable, Slate, withReact } from "slate-react";
import type { RenderLeafProps as SlateRenderLeafProps } from "slate-react";
import { unified } from "unified";

// We will map highlights directly via mdast offsets preserved on text leaves
import { readerFontFamily } from "@/shared/constants/fonts";
import CodeBlock from "./CodeBlock";
import { CodeBlockErrorBoundary } from "./CodeBlockErrorBoundary";
import {
  LAYOUT,
  TEXT_PROCESSING,
} from "@/components/DocumentWithEvaluations/constants";

// Define custom element types for Slate
type CustomText = {
  text: string;
  mdStart?: number;
  mdEnd?: number;
  strong?: boolean;
  bold?: boolean;
  emphasis?: boolean;
  italic?: boolean;
  code?: boolean;
};
type CustomElement = {
  type:
    | "paragraph"
    | "heading-one"
    | "heading-two"
    | "heading-three"
    | "heading-four"
    | "heading-five"
    | "heading-six"
    | "block-quote"
    | "list-item"
    | "link"
    | "code"
    | "image"
    | "list";
  children?: (CustomElement | CustomText)[];
  url?: string;
  value?: string;
  lang?: string;
  alt?: string;
  ordered?: boolean;
};

// Minimal mdast types we need
type MdPoint = { offset?: number };
type MdPosition = { start?: MdPoint; end?: MdPoint };
type MdNode = {
  type: string;
  value?: string;
  children?: MdNode[];
  position?: MdPosition;
  depth?: number;
  lang?: string;
  language?: string;
  meta?: string;
  url?: string;
  alt?: string;
  ordered?: boolean;
};

type Marks = { strong?: boolean; emphasis?: boolean; code?: boolean };

// Helper: safe access to mdast offset positions
const getOffsets = (node: MdNode): { start?: number; end?: number } => {
  const start = node?.position?.start?.offset;
  const end = node?.position?.end?.offset;
  return {
    start: typeof start === "number" ? start : undefined,
    end: typeof end === "number" ? end : undefined,
  };
};

// Convert mdast to Slate while preserving per-leaf markdown offsets (mdStart/mdEnd)
const mdastToSlateWithOffsets = (
  tree: unknown,
  markdown: string
): Descendant[] => {
  const root = tree as MdNode;
  const toHeadingType = (depth: number): CustomElement["type"] => {
    const map = [
      "heading-one",
      "heading-two",
      "heading-three",
      "heading-four",
      "heading-five",
      "heading-six",
    ] as const;
    return map[Math.max(1, Math.min(6, depth)) - 1] as CustomElement["type"];
  };

  const createText = (
    value: string,
    mdStart?: number,
    mdEnd?: number,
    marks?: Marks
  ): CustomText => {
    return {
      text: value,
      mdStart,
      mdEnd,
      strong: marks?.strong,
      bold: marks?.strong,
      emphasis: marks?.emphasis,
      italic: marks?.emphasis,
      code: marks?.code,
    };
  };

  const sliceTextBetween = (start?: number, end?: number): string => {
    if (
      typeof start !== "number" ||
      typeof end !== "number" ||
      start < 0 ||
      end > markdown.length ||
      end < start
    )
      return "";
    return markdown.slice(start, end);
  };

  const adjustInlineCodeOffsets = (
    start?: number,
    end?: number
  ): { mdStart?: number; mdEnd?: number } => {
    if (typeof start !== "number" || typeof end !== "number")
      return { mdStart: start, mdEnd: end };
    const raw = markdown.slice(start, end);
    // Count leading and trailing backticks of same length
    const leadingMatch = raw.match(/^`+/);
    const trailingMatch = raw.match(/`+$/);
    const ticks =
      leadingMatch && trailingMatch
        ? Math.min(leadingMatch[0].length, trailingMatch[0].length)
        : 1;
    const contentStart = start + ticks;
    const contentEnd = end - ticks;
    if (contentStart <= contentEnd)
      return { mdStart: contentStart, mdEnd: contentEnd };
    return { mdStart: start, mdEnd: end };
  };

  const visit = (
    node: MdNode,
    marks: Marks = {}
  ): Descendant | Descendant[] => {
    switch (node.type) {
      case "root":
        return (node.children || [])
          .map((c: MdNode) => visit(c, marks))
          .filter(Boolean) as Descendant[];
      case "paragraph":
        return {
          type: "paragraph",
          children: (node.children || [])
            .map((c: MdNode) => visit(c, marks))
            .flat() as Descendant[],
        } as unknown as Descendant;
      case "text": {
        const { start, end } = getOffsets(node);
        // mdast text node value is already the literal text content
        return createText(
          node.value || "",
          start,
          end,
          marks
        ) as unknown as Descendant;
      }
      case "strong":
        return (node.children || [])
          .map((c: MdNode) => visit(c, { ...marks, strong: true }))
          .flat() as Descendant[];
      case "emphasis":
        return (node.children || [])
          .map((c: MdNode) => visit(c, { ...marks, emphasis: true }))
          .flat() as Descendant[];
      case "inlineCode": {
        const { start, end } = getOffsets(node);
        const { mdStart, mdEnd } = adjustInlineCodeOffsets(start, end);
        return createText(
          node.value || sliceTextBetween(mdStart, mdEnd),
          mdStart,
          mdEnd,
          { ...marks, code: true }
        ) as unknown as Descendant;
      }
      case "code": {
        return {
          type: "code",
          lang: node.lang || node.language || node.meta || "plain",
          value: node.value || "",
          children: [{ text: "" }],
        } as unknown as Descendant;
      }
      case "heading":
        return {
          type: toHeadingType(node.depth || 1),
          children: (node.children || [])
            .map((c: MdNode) => visit(c, marks))
            .flat() as Descendant[],
        } as unknown as Descendant;
      case "blockquote":
        return {
          type: "block-quote",
          children: (node.children || [])
            .map((c: MdNode) => visit(c, marks))
            .flat() as Descendant[],
        } as unknown as Descendant;
      case "link":
        return {
          type: "link",
          url: node.url,
          children: (node.children || [])
            .map((c: MdNode) => visit(c, marks))
            .flat() as Descendant[],
        } as unknown as Descendant;
      case "list":
        return {
          type: "list",
          ordered: node.ordered === true,
          children: (node.children || [])
            .map((c: MdNode) => visit(c, marks))
            .flat() as Descendant[],
        } as unknown as Descendant;
      case "listItem":
        return {
          type: "list-item",
          children: (node.children || [])
            .map((c: MdNode) => visit(c, marks))
            .flat() as Descendant[],
        } as unknown as Descendant;
      case "image":
        return {
          type: "image",
          url: node.url,
          alt: node.alt,
          children: [{ text: "" }],
        } as unknown as Descendant;
      case "thematicBreak":
        // Represent as an empty paragraph for simplicity
        return {
          type: "paragraph",
          children: [{ text: "" }],
        } as unknown as Descendant;
      default:
        if (Array.isArray(node.children)) {
          return (node.children || [])
            .map((c: MdNode) => visit(c, marks))
            .flat() as Descendant[];
        }
        return { text: "" } as unknown as Descendant;
    }
  };

  const children = visit(root);
  return Array.isArray(children)
    ? (children as Descendant[])
    : [children as Descendant];
};

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
  hoveredTag?: string | null;
}

interface RenderElementProps {
  attributes: React.HTMLAttributes<HTMLElement>;
  children: React.ReactNode;
  element: CustomElement;
  highlights?: Highlight[];
}

const renderElement = ({
  attributes,
  children,
  element,
  highlights,
}: RenderElementProps) => {
  switch (element.type) {
    case "heading-one":
      return (
        <h1 {...attributes} className="mb-6 text-4xl font-bold">
          {children}
        </h1>
      );
    case "heading-two":
      return (
        <h2 {...attributes} className="mb-5 text-3xl font-bold">
          {children}
        </h2>
      );
    case "heading-three":
      return (
        <h3 {...attributes} className="mb-4 text-2xl font-bold">
          {children}
        </h3>
      );
    case "heading-four":
      return (
        <h4 {...attributes} className="mb-3 text-xl font-bold">
          {children}
        </h4>
      );
    case "heading-five":
      return (
        <h5 {...attributes} className="mb-3 text-lg font-bold">
          {children}
        </h5>
      );
    case "heading-six":
      return (
        <h6 {...attributes} className="mb-3 text-base font-bold">
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
          className="mb-4 border-l-4 border-gray-300 pl-4 italic"
        >
          {children}
        </blockquote>
      );
    case "list":
      return element.ordered ? (
        <ol {...attributes} className="my-2 list-decimal pl-5">
          {children}
        </ol>
      ) : (
        <ul {...attributes} className="my-2 list-disc pl-5">
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
    case "code":
      // Find which lines to highlight based on comment highlights
      const codeContent = element.value || "";
      const codeLines = codeContent.split("\n");
      const linesToHighlight: number[] = [];

      // Track which highlights match this code block and their line positions
      const highlightPositions: Array<{ tag: string; lineNumber: number }> = [];

      // Check each highlight to see if its quoted text appears in this code block
      if (highlights && Array.isArray(highlights)) {
        highlights.forEach((highlight: Highlight) => {
          if (highlight.quotedText) {
            // Search for the quoted text in the code block
            const quotedText = highlight.quotedText.trim();

            // Skip if quoted text is too short or just punctuation
            if (quotedText.length < TEXT_PROCESSING.MIN_HIGHLIGHT_LENGTH) {
              return;
            }

            // Check if the entire quoted text appears in the code block
            if (codeContent.includes(quotedText)) {
              // Find the first line that contains this quoted text
              const quotedStart = codeContent.indexOf(quotedText);
              let currentPos = 0;
              let firstMatchingLine = -1;

              codeLines.forEach((line: string, index: number) => {
                const lineStart = currentPos;
                const lineEnd = currentPos + line.length;

                // Check if the quoted text starts in this line
                if (
                  quotedStart >= lineStart &&
                  quotedStart < lineEnd &&
                  firstMatchingLine === -1
                ) {
                  firstMatchingLine = index + 1; // 1-indexed
                }

                // Track all lines that contain part of this quoted text
                if (
                  quotedStart <= lineEnd &&
                  quotedStart + quotedText.length >= lineStart
                ) {
                  if (!linesToHighlight.includes(index + 1)) {
                    linesToHighlight.push(index + 1);
                  }
                }

                currentPos = lineEnd + 1; // +1 for newline
              });

              if (firstMatchingLine > 0) {
                highlightPositions.push({
                  tag: highlight.tag,
                  lineNumber: firstMatchingLine,
                });
              }
            }
          }
        });
      }

      return (
        <CodeBlockErrorBoundary>
          <CodeBlock
            code={codeContent}
            language={element.lang || "plain"}
            attributes={attributes}
            highlightLines={linesToHighlight}
            highlightPositions={highlightPositions}
          />
        </CodeBlockErrorBoundary>
      );
    case "image":
      // Validate image URL before rendering
      if (
        !element.url ||
        typeof element.url !== "string" ||
        element.url.trim() === ""
      ) {
        return (
          <div {...attributes} contentEditable={false} className="relative">
            <div className="rounded bg-gray-200 p-4 text-gray-600">
              [Invalid image URL]
            </div>
            {children}
          </div>
        );
      }
      return (
        <div {...attributes} contentEditable={false} className="relative">
          <Image
            src={element.url}
            alt={element.alt || ""}
            width={800}
            height={600}
            style={{ maxWidth: "100%", height: "auto", display: "block" }}
            unoptimized // Since we don't know the dimensions of external images
          />
          {children}
        </div>
      );
    default:
      return (
        <span {...attributes} className="mb-4 inline-block">
          {children}
        </span>
      );
  }
};

type DecoratedLeaf = Text & {
  highlight?: boolean;
  tag?: string;
  color?: string;
  isActive?: boolean;
  strong?: boolean;
  bold?: boolean;
  emphasis?: boolean;
  italic?: boolean;
  code?: boolean;
};

const renderLeaf = ({
  attributes,
  children,
  leaf,
  activeTag,
  hoveredTag,
  onHighlightClick,
  onHighlightHover,
}: Omit<SlateRenderLeafProps, "leaf"> & {
  leaf: DecoratedLeaf;
  activeTag?: string | null;
  hoveredTag?: string | null;
  onHighlightClick?: (tag: string) => void;
  onHighlightHover?: (tag: string | null) => void;
}) => {
  // Create a new set of attributes to avoid modifying the original
  const leafAttributes = { ...attributes };

  let el = children;

  // Apply formatting in a specific order to handle nested formatting
  if (leaf.code) {
    el = <code className="rounded bg-gray-100 px-1">{el}</code>;
  }

  // Handle both emphasis/italic properties
  if (leaf.emphasis || leaf.italic) {
    el = <em style={{ fontStyle: "italic" }}>{el}</em>;
  }

  // Handle both strong/bold properties
  if (leaf.strong || leaf.bold) {
    el = <strong style={{ fontWeight: "bold" }}>{el}</strong>;
  }

  // Apply highlight styling if this is a highlighted section
  if (leaf.highlight) {
    // Use leaf.isActive if available, otherwise fall back to tag comparison
    const isActive = leaf.isActive || leaf.tag === activeTag;
    const isHovered = leaf.tag === hoveredTag;

    el = (
      <span
        {...leafAttributes}
        data-tag={leaf.tag}
        id={`highlight-${leaf.tag}`}
        style={{
          backgroundColor: (() => {
            // Handle color format - remove # if present
            const rawColor = leaf.color ?? "3b82f6"; // default blue-500
            const color = rawColor.startsWith("#")
              ? rawColor.slice(1)
              : rawColor;
            const r = parseInt(color.slice(0, 2), 16);
            const g = parseInt(color.slice(2, 4), 16);
            const b = parseInt(color.slice(4, 6), 16);
            const rr = Number.isFinite(r) ? r : 59;
            const gg = Number.isFinite(g) ? g : 130;
            const bb = Number.isFinite(b) ? b : 246;
            return `rgba(${rr}, ${gg}, ${bb}, ${isActive ? 0.8 : 0.3})`;
          })(),
          borderRadius: "2px",
          boxShadow: isActive
            ? "0 0 0 2px rgba(59, 130, 246, 0.5)"
            : isHovered
              ? "0 0 0 2px rgba(59, 130, 246, 0.3)"
              : "none",
          transform: isActive ? "scale(1.01)" : "scale(1)",
          transformOrigin: "center",
          padding: "0 1px",
          margin: "0 -1px",
          scrollMarginTop: `${LAYOUT.SCROLL_MARGIN_TOP}px`, // Add scroll margin to prevent the highlight from being hidden under the header
        }}
        className={`group cursor-pointer transition-all duration-150 ease-out hover:bg-opacity-60 ${
          isActive ? "relative z-10" : ""
        }`}
        onClick={(e) => {
          e.preventDefault();
          onHighlightClick?.(leaf.tag || "");
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onHighlightClick?.(leaf.tag || "");
          }
        }}
        onMouseEnter={(e) => {
          e.preventDefault();
          onHighlightHover?.(leaf.tag ?? null);
        }}
        onMouseLeave={(e) => {
          e.preventDefault();
          onHighlightHover?.(null);
        }}
        role="button"
        tabIndex={0}
        aria-label={`Highlighted text: ${children}`}
      >
        {el}
      </span>
    );
    return el;
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
  hoveredTag,
}) => {
  const editor = useMemo(() => withHistory(withReact(createEditor())), []);
  const [initialized, setInitialized] = useState(false);
  const initRef = useRef(false);
  const _renderedHighlightsRef = useRef(new Set<string>());

  // Convert markdown to Slate with md offsets preserved on leaves
  const value = useMemo(() => {
    try {
      const processor = unified().use(remarkParse).use(remarkGfm);
      // Parse to mdast (positions included by default)
      const tree = (
        processor as unknown as { parse: (input: string) => unknown }
      ).parse(content);
      const nodes = mdastToSlateWithOffsets(tree, content);
      return nodes as Descendant[];
    } catch (_error) {
      return [
        {
          type: "paragraph",
          children: [{ text: content }],
        },
      ] as unknown as Descendant[];
    }
  }, [content]);

  // Initialize editor
  useEffect(() => {
    if (!initRef.current && value) {
      editor.children = value;
      editor.onChange();
      initRef.current = true;
      setInitialized(true);
    }
  }, [editor, value, content]);

  // Decorate function to add highlights using our improved offset mapping
  const decorate = useCallback(
    ([node, path]: [Node, number[]]) => {
      if (!Text.isText(node) || !initialized) {
        return [];
      }

      // Check if this text node is within a code block
      const ancestors = Node.ancestors(editor, path);
      for (const [ancestor] of ancestors) {
        if (
          Element.isElement(ancestor) &&
          (ancestor as CustomElement).type === "code"
        ) {
          // Skip highlighting within code blocks
          return [];
        }
      }

      type HighlightRange = {
        anchor: { path: number[]; offset: number };
        focus: { path: number[]; offset: number };
        highlight: true;
        tag: string;
        color: string;
        isActive: boolean;
      };
      const ranges: HighlightRange[] = [];
      const leafWithMd = node as unknown as CustomText;
      const mdStart = leafWithMd.mdStart as number | undefined;
      const mdEnd = leafWithMd.mdEnd as number | undefined;
      if (typeof mdStart !== "number" || typeof mdEnd !== "number") return [];

      for (const highlight of highlights) {
        if (
          highlight?.startOffset === undefined ||
          highlight?.endOffset === undefined ||
          highlight?.startOffset < 0 ||
          highlight?.endOffset <= highlight?.startOffset
        ) {
          console.warn(`Skipping invalid highlight ${highlight.tag}:`, {
            startOffset: highlight?.startOffset,
            endOffset: highlight?.endOffset,
            tag: highlight?.tag,
          });
          continue; // Skip invalid highlights
        }

        const tag = highlight.tag || "";

        // If this Text leaf overlaps with highlight in markdown offsets
        if (highlight.endOffset > mdStart && highlight.startOffset < mdEnd) {
          const relativeStart = Math.max(0, highlight.startOffset - mdStart);
          const relativeEnd = Math.min(
            node.text.length,
            highlight.endOffset - mdStart
          );
          if (relativeStart < relativeEnd) {
            ranges.push({
              anchor: { path, offset: relativeStart },
              focus: { path, offset: relativeEnd },
              highlight: true,
              tag,
              color: highlight.color || "yellow-200",
              isActive: tag === activeTag,
            });
          }
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
    <div
      style={{
        fontFamily: readerFontFamily,
      }}
    >
      <Slate editor={editor} initialValue={value}>
        <Editable
          data-testid="slate-editable"
          decorate={decorate}
          renderElement={(props) => renderElement({ ...props, highlights })}
          renderLeaf={(props) =>
            renderLeaf({
              ...props,
              activeTag,
              hoveredTag,
              onHighlightClick,
              onHighlightHover,
            })
          }
          readOnly
          className="prose-md prose prose-slate max-w-none [&_em]:italic [&_strong]:font-bold"
        />
      </Slate>
    </div>
  );
};

export default SlateEditor;
