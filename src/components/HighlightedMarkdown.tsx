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

    // Get all text nodes
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
    const textNodes: Text[] = [];
    while (walker.nextNode()) {
      const node = walker.currentNode as Text;
      if (node.nodeValue?.trim()) textNodes.push(node);
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
        const range = document.createRange();
        range.setStart(startNode.node, startOffset - startNode.start);
        range.setEnd(endNode.node, endOffset - endNode.start);

        const span = document.createElement("span");
        span.className = `bg-${color} rounded cursor-pointer hover:bg-opacity-80`;
        span.dataset.highlightTag = tag;
        span.id = `highlight-${tag}`;
        span.dataset.tag = tag;

        range.surroundContents(span);
      } catch (err) {
        console.error(`Error applying highlight ${tag}:`, err);
      }
    });
  }, [highlights, highlightColors, rendered]);

  return (
    <div
      ref={containerRef}
      className="prose prose-slate prose-lg max-w-none"
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
