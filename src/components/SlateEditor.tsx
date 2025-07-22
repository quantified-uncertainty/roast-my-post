"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Image from 'next/image';

import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { remarkToSlate } from "remark-slate-transformer";
import {
  createEditor,
  Descendant,
  Element,
  Node,
  Text,
} from "slate";
import { withHistory } from "slate-history";
import {
  Editable,
  Slate,
  withReact,
} from "slate-react";
import { unified } from "unified";

// Import our improved hooks for Phase 2
import { useHighlightMapper } from "@/hooks/useHighlightMapper";
import { usePlainTextOffsets } from "@/hooks/usePlainTextOffsets";
import { readerFontFamily } from "@/lib/fonts";
import CodeBlock from "./CodeBlock";
import { CodeBlockErrorBoundary } from "./CodeBlockErrorBoundary";
import { UI_LAYOUT, TEXT_PROCESSING, ANIMATION } from "@/components/DocumentWithEvaluations/constants/uiConstants";

// Define custom element types for Slate
type CustomText = { text: string };
type CustomElement = {
  type: 'paragraph' | 'heading-one' | 'heading-two' | 'heading-three' | 
        'heading-four' | 'heading-five' | 'heading-six' | 'block-quote' | 
        'list-item' | 'link' | 'code' | 'image' | 'list';
  children?: (CustomElement | CustomText)[];
  url?: string;
  value?: string;
  lang?: string;
  alt?: string;
  ordered?: boolean;
};

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

const renderElement = ({ attributes, children, element, highlights }: RenderElementProps) => {
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
      const codeLines = codeContent.split('\n');
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
                if (quotedStart >= lineStart && quotedStart < lineEnd && firstMatchingLine === -1) {
                  firstMatchingLine = index + 1; // 1-indexed
                }
                
                // Track all lines that contain part of this quoted text
                if (quotedStart <= lineEnd && (quotedStart + quotedText.length) >= lineStart) {
                  if (!linesToHighlight.includes(index + 1)) {
                    linesToHighlight.push(index + 1);
                  }
                }
                
                currentPos = lineEnd + 1; // +1 for newline
              });
              
              if (firstMatchingLine > 0) {
                highlightPositions.push({ tag: highlight.tag, lineNumber: firstMatchingLine });
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
      return (
        <div {...attributes} contentEditable={false} className="relative">
          <Image
            src={element.url || ""}
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

const renderLeaf = ({
  attributes,
  children,
  leaf,
  activeTag,
  hoveredTag,
  onHighlightClick,
  onHighlightHover,
}: any) => {
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
            const color = leaf.color.startsWith('#') ? leaf.color.slice(1) : leaf.color;
            const r = parseInt(color.slice(0, 2), 16) || 59;
            const g = parseInt(color.slice(2, 4), 16) || 130;
            const b = parseInt(color.slice(4, 6), 16) || 246;
            return `rgba(${r}, ${g}, ${b}, ${isActive ? 0.8 : 0.3})`;
          })(),
          borderRadius: "2px",
          boxShadow:
            isActive
              ? "0 0 0 2px rgba(59, 130, 246, 0.5)"
              : isHovered
              ? "0 0 0 2px rgba(59, 130, 246, 0.3)"
              : "none",
          transform: isActive ? "scale(1.01)" : "scale(1)",
          transformOrigin: "center",
          padding: "0 1px",
          margin: "0 -1px",
          scrollMarginTop: `${UI_LAYOUT.SCROLL_MARGIN_TOP}px`, // Add scroll margin to prevent the highlight from being hidden under the header
        }}
        className={`group cursor-pointer transition-all duration-[${ANIMATION.HIGHLIGHT_TRANSITION}ms] ease-out hover:bg-opacity-60 ${
          isActive ? "relative z-10" : ""
        }`}
        onClick={(e) => {
          e.preventDefault();
          onHighlightClick?.(leaf.tag);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onHighlightClick?.(leaf.tag);
          }
        }}
        onMouseEnter={(e) => {
          e.preventDefault();
          onHighlightHover?.(leaf.tag);
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
  const [slateText, setSlateText] = useState("");
  const renderedHighlightsRef = useRef(new Set<string>());

  // Convert markdown to Slate nodes using remark-slate-transformer
  const value = useMemo(() => {
    try {
      // Create a processor with remark-parse and remark-gfm for markdown support
      const processor = unified()
        .use(remarkParse)
        .use(remarkGfm) // Add GitHub-Flavored Markdown support (includes footnotes)
        // @ts-expect-error - remarkToSlate types are not fully compatible
        .use(remarkToSlate, {
          // Configure node types for proper formatting
          nodeTypes: {
            emphasis: "emphasis",
            strong: "strong",
            inlineCode: "inlineCode",
            code: "code",
            codeBlock: "code",
            link: "link",
            paragraph: "paragraph",
            heading: "heading",
            list: "list",
            listItem: "listItem",
            blockquote: "block-quote",
          },
        });

      // Process the markdown content
      const result = processor.processSync(content);
      let nodes = result.result as Descendant[];


      // Apply a custom processor for handling markdown formatting
      const processNode = (node: any): any => {
        // Handle leaf text nodes
        if (typeof node?.text === "string") {
          return node;
        }

        // Process the node based on its type
        switch (node?.type) {
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

          case "code":
          case "code-block":
          case "codeBlock":
            // Extract the code content from children if it's there
            let codeValue = node.value || "";
            if (!codeValue && node.children && node.children.length > 0) {
              // Sometimes the code is in the children as text nodes
              codeValue = node.children.map((child: any) => 
                child.text || child.value || ""
              ).join("");
            }
            
            return {
              ...node,
              type: "code",
              value: codeValue,
              lang: node.lang || node.language || node.meta || "plain",
              children: [{ text: "" }], // Code blocks need at least one child
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

      // Process all nodes in the tree and filter out nulls
      nodes = nodes.map(processNode).filter(node => node !== null);
      
      // Validate and fix nodes to ensure they have proper text content
      const validateNode = (node: any): any => {
        // If it's a text node, ensure it has the correct structure
        if (typeof node === 'string') {
          return { text: node };
        }
        
        if (node && typeof node.text === 'string') {
          return node;
        }
        
        // If it's an element, ensure it has children
        if (node && typeof node === 'object') {
          if (!node.children || !Array.isArray(node.children)) {
            // If no children, create a text node
            return {
              ...node,
              children: [{ text: '' }]
            };
          }
          
          // Recursively validate children, ensuring they're not empty
          const validatedChildren = node.children
            .map(validateNode)
            .filter((child: any) => child !== null && child !== undefined);
          
          // If no valid children remain, add an empty text node
          if (validatedChildren.length === 0) {
            validatedChildren.push({ text: '' });
          }
          
          return {
            ...node,
            children: validatedChildren
          };
        }
        
        // Fallback for invalid nodes
        return { text: '' };
      };
      
      nodes = nodes.map(validateNode);
      return nodes as Descendant[];
    } catch (_error) {
      // Error parsing markdown - return empty document
      // Return a simple default node if parsing fails
      return [
        {
          type: "paragraph",
          children: [{ text: content }],
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

      // Check if this text node is within a code block
      const ancestors = Node.ancestors(editor, path);
      for (const [ancestor] of ancestors) {
        if (Element.isElement(ancestor) && (ancestor as CustomElement).type === 'code') {
          // Skip highlighting within code blocks
          return [];
        }
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
          console.warn(`Skipping invalid highlight ${highlight.tag}:`, {
            startOffset: highlight?.startOffset,
            endOffset: highlight?.endOffset,
            tag: highlight?.tag
          });
          continue; // Skip invalid highlights
        }

        const tag = highlight.tag || "";

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
              tag,
              color: highlight.color || "yellow-200",
              isActive: tag === activeTag,
            });
          }

          // 2. Try without markdown formatting (if not found)
          if (!found) {
            const normalizedHighlightText = normalizeText(highlightText);

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
                tag,
                color: highlight.color || "yellow-200",
                isActive: tag === activeTag,
              });
              found = true;
            }
          }

          // 3. Try with partial text matching (if still not found)
          if (!found && highlightText && nodeText) {
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
                tag,
                color: highlight.color || "yellow-200",
                isActive: tag === activeTag,
              });
              found = true;
            }
          }

          if (!found) {
            console.warn(`Failed to render highlight ${highlight.tag}:`, {
              startOffset: highlight.startOffset,
              endOffset: highlight.endOffset,
              quotedText: highlight.quotedText?.substring(0, 50) + '...',
              reason: 'No text match found in any node'
            });
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
              tag,
              color: highlight.color || "yellow-200",
              isActive: tag === activeTag,
            });
          }
        }
      }

      return ranges;
    },
    [highlights, activeTag, initialized, mdToSlateOffset, nodeOffsets]
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
