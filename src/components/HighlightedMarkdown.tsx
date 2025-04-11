"use client";

import { useEffect, useState } from "react";

import type { Components } from "react-markdown";
import Markdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";

interface HighlightedMarkdownProps {
  content: string;
  onHighlightHover?: (tag: string) => void;
}

export function HighlightedMarkdown({
  content,
  onHighlightHover,
}: HighlightedMarkdownProps) {
  const [processedContent, setProcessedContent] = useState("");

  useEffect(() => {
    // Replace {{text:tag}} syntax with <span class="highlight" data-tag="n">
    const processed = content.replace(
      /\{\{(.*?):(.*?)\}\}/g,
      (_, text, tag) => {
        const trimmedTag = tag.trim();
        return `<span class="highlight" data-tag="${trimmedTag}">${text}</span>`;
      }
    );
    setProcessedContent(processed);
  }, [content]);

  const components: Components = {
    span: ({ className, children, ...props }) => {
      if (className === "highlight") {
        const tag = (props as any)["data-tag"];
        return (
          <span
            className="bg-yellow-800 hover:bg-yellow-700 px-1 rounded transition-colors duration-200 cursor-help"
            data-tag={tag}
            onMouseEnter={() => {
              console.log("Mouse enter with tag:", tag); // Debug log
              onHighlightHover?.(tag);
            }}
          >
            {children}
          </span>
        );
      }

      return (
        <span className={className} {...props}>
          {children}
        </span>
      );
    },
  };

  return (
    <Markdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeRaw]}
      components={components}
    >
      {processedContent}
    </Markdown>
  );
}
