"use client";

import React, {
  useEffect,
  useRef,
  useState,
} from 'react';

import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';

import { Highlight } from '@/types/documentReview';

interface HighlightedMarkdownProps {
  content: string;
  onHighlightHover: (tag: string | null) => void;
  onHighlightClick: (tag: string) => void;
  highlightColors: Record<string, string>;
  activeTag: string | null;
  highlights?: Record<string, Highlight>;
}

export function HighlightedMarkdown({
  content,
  onHighlightHover,
  onHighlightClick,
  highlightColors,
  activeTag,
  highlights,
}: HighlightedMarkdownProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [rendered, setRendered] = useState(false);

  // Add highlight spans to DOM
  useEffect(() => {
    if (!containerRef.current || !rendered || !highlights) return;

    const container = containerRef.current;

    // Clean up existing highlights
    const prev = container.querySelectorAll("[data-highlight-tag]");
    prev.forEach((span) => {
      const parent = span.parentNode;
      if (!parent) return;
      while (span.firstChild) parent.insertBefore(span.firstChild, span);
      parent.removeChild(span);
    });

    // Get all text nodes, including whitespace
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
    const textNodes: Text[] = [];
    while (walker.nextNode()) {
      const node = walker.currentNode as Text;
      // Include all text nodes, even empty ones
      textNodes.push(node);
    }

    // Build flat text + position map
    let offset = 0;
    const positions = textNodes.map((node) => {
      const start = offset;
      const length = node.nodeValue?.length || 0;
      offset += length;
      return { node, start, end: start + length };
    });

    // Apply highlights
    Object.entries(highlights).forEach(([tag, { startOffset, endOffset }]) => {
      const color = highlightColors[tag] || "yellow-100";

      const startNode = positions.find(
        (p) => p.start <= startOffset && p.end > startOffset
      );
      const endNode = positions.find(
        (p) => p.start < endOffset && p.end >= endOffset
      );

      if (!startNode || !endNode) return;

      try {
        // Handle case where the highlight crosses element boundaries
        // Get common ancestor of start and end nodes
        const startEl = startNode.node;
        const endEl = endNode.node;

        // Create highlight spans for each intersecting text node
        const highlightedNodes: HTMLElement[] = [];
        let currentNode: Node | null = null;
        let insideHighlight = false;

        // Find all nodes between start and end
        const allNodesWalker = document.createTreeWalker(
          container,
          NodeFilter.SHOW_TEXT
        );
        while (allNodesWalker.nextNode()) {
          currentNode = allNodesWalker.currentNode;

          // Check if we've reached the start node
          if (currentNode === startEl) {
            insideHighlight = true;
          }

          // Process node if we're inside the highlight range
          if (insideHighlight) {
            const nodePosition = positions.find((p) => p.node === currentNode);
            if (!nodePosition) continue;

            // Create a highlight span for this text node
            const span = document.createElement("span");
            span.className = `bg-${color} rounded cursor-pointer hover:bg-opacity-80`;
            span.dataset.highlightTag = tag;
            span.dataset.tag = tag;

            // This is the start node
            if (currentNode === startEl) {
              const range = document.createRange();
              range.setStart(currentNode, startOffset - nodePosition.start);
              range.setEnd(currentNode, nodePosition.end - nodePosition.start);

              if (!range.collapsed && range.toString().length > 0) {
                const textContent = currentNode.textContent || "";
                const beforeText = textContent.substring(
                  0,
                  startOffset - nodePosition.start
                );
                const highlightText = textContent.substring(
                  startOffset - nodePosition.start,
                  nodePosition.end - nodePosition.start
                );

                // Replace the text node with before + highlighted content
                const beforeTextNode = document.createTextNode(beforeText);
                currentNode.parentNode?.insertBefore(
                  beforeTextNode,
                  currentNode
                );

                span.id = `highlight-${tag}`;
                span.textContent = highlightText;
                currentNode.parentNode?.insertBefore(span, currentNode);

                // The current node is now outdated, get the next node after our insertion
                highlightedNodes.push(span as HTMLElement);
                currentNode.parentNode?.removeChild(currentNode);
              }
            }
            // This is the end node
            else if (currentNode === endEl) {
              const range = document.createRange();
              range.setStart(currentNode, 0);
              range.setEnd(currentNode, endOffset - nodePosition.start);

              if (!range.collapsed && range.toString().length > 0) {
                const textContent = currentNode.textContent || "";
                const highlightText = textContent.substring(
                  0,
                  endOffset - nodePosition.start
                );
                const afterText = textContent.substring(
                  endOffset - nodePosition.start
                );

                // Replace the text node with highlighted content + after
                span.textContent = highlightText;
                currentNode.parentNode?.insertBefore(span, currentNode);

                const afterTextNode = document.createTextNode(afterText);
                currentNode.parentNode?.insertBefore(
                  afterTextNode,
                  currentNode
                );

                highlightedNodes.push(span as HTMLElement);
                currentNode.parentNode?.removeChild(currentNode);

                // We've processed the end node, exit the loop
                insideHighlight = false;
              }
            }
            // This is a node completely inside the highlight range
            else {
              const originalNode = currentNode;
              span.textContent = originalNode.textContent;
              originalNode.parentNode?.insertBefore(span, originalNode);
              originalNode.parentNode?.removeChild(originalNode);
              highlightedNodes.push(span as HTMLElement);
            }
          }

          // Exit if we're done with the highlight
          if (currentNode === endEl) {
            break;
          }
        }

        // If first highlight, add the ID to the first span for scrolling
        if (highlightedNodes.length > 0 && !highlightedNodes[0].id) {
          (highlightedNodes[0] as HTMLElement).id = `highlight-${tag}`;
        }
      } catch (err) {
        console.error(`Error applying highlight ${tag}:`, err);
      }
    });
  }, [highlights, highlightColors, rendered]);

  return (
    <div
      ref={containerRef}
      className="prose prose-slate prose-md max-w-none"
      onClick={(e: React.MouseEvent<HTMLDivElement>) => {
        const target = e.target as HTMLElement;
        if (target.dataset.tag) onHighlightClick(target.dataset.tag);
      }}
      onMouseOver={(e: React.MouseEvent<HTMLDivElement>) => {
        const target = e.target as HTMLElement;
        if (target.dataset.tag) onHighlightHover(target.dataset.tag);
      }}
      onMouseOut={() => onHighlightHover(null)}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        children={content}
      />
      {/* Wait for ReactMarkdown to finish rendering before applying highlights */}
      <div style={{ display: "none" }} ref={() => setRendered(true)} />
    </div>
  );
}
