"use client";

import React from 'react';

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
  // Create a processed content with highlighted spans
  let processedContent = content;

  // Handle both the legacy {{text:tag}} format and the new highlight structure
  // First check for legacy format
  processedContent = processedContent.replace(
    /{{(.*?):(\d+)}}/g,
    (_, text, tag) => {
      const color = highlightColors[tag] || "yellow-100";
      return `<span 
        id="highlight-${tag}"
        class="bg-${color} rounded cursor-pointer hover:bg-opacity-80" 
        data-tag="${tag}"
      >${text}</span>`;
    }
  );

  // Then apply new highlight structure if provided
  if (highlights) {
    // Sort highlights by startOffset in descending order to avoid index shifting problems
    const sortedHighlights = Object.entries(highlights).sort(
      ([_, a], [__, b]) => b.startOffset - a.startOffset
    );

    // Apply highlights to content
    for (const [tag, highlight] of sortedHighlights) {
      const color = highlightColors[tag] || "yellow-100";
      // Safety check to prevent index out of bounds
      const start = Math.max(
        0,
        Math.min(highlight.startOffset, content.length)
      );
      const end = Math.max(0, Math.min(highlight.endOffset, content.length));

      const textToHighlight = content.substring(start, end);

      // Create a new string with the highlighted span
      const beforeText = processedContent.substring(0, start);
      const afterText = processedContent.substring(end);

      // Only add highlight if we actually have text to highlight
      if (textToHighlight.length > 0) {
        processedContent = `${beforeText}<span 
          id="highlight-${tag}"
          class="bg-${color} rounded cursor-pointer hover:bg-opacity-80" 
          data-tag="${tag}"
        >${textToHighlight}</span>${afterText}`;
      }
    }
  }

  return (
    <div
      className="prose prose-slate prose-lg max-w-none"
      onClick={(e: React.MouseEvent<HTMLDivElement>) => {
        const target = e.target as HTMLElement;
        if (target.dataset.tag) {
          onHighlightClick(target.dataset.tag);
        }
      }}
      onMouseOver={(e: React.MouseEvent<HTMLDivElement>) => {
        const target = e.target as HTMLElement;
        if (target.dataset.tag) {
          onHighlightHover(target.dataset.tag);
        }
      }}
      onMouseOut={() => onHighlightHover(null)}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
        {processedContent}
      </ReactMarkdown>
    </div>
  );
}
