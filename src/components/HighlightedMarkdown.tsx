"use client";

import React from "react";

import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";

interface HighlightedMarkdownProps {
  content: string;
  onHighlightHover: (tag: string | null) => void;
  onHighlightClick: (tag: string) => void;
  highlightColors: Record<string, string>;
  activeTag: string | null;
}

export function HighlightedMarkdown({
  content,
  onHighlightHover,
  onHighlightClick,
  highlightColors,
  activeTag,
}: HighlightedMarkdownProps) {
  // Process the content to replace highlight syntax with spans
  const processedContent = content.replace(
    /{{(.*?):(\d+)}}/g,
    (_, text, tag) => {
      const color = highlightColors[tag] || "yellow-100";
      return `<span 
        id="highlight-${tag}"
        class="bg-${color} px-1 rounded cursor-pointer hover:bg-opacity-80" 
        data-tag="${tag}"
      >${text}</span>`;
    }
  );

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
