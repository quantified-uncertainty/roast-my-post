"use client";

import { useEffect, useState } from "react";

import type { Components } from "react-markdown";
import Markdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";

interface HighlightedMarkdownProps {
  content: string;
}

export function HighlightedMarkdown({ content }: HighlightedMarkdownProps) {
  const [processedContent, setProcessedContent] = useState("");

  useEffect(() => {
    // Process the content to replace highlight syntax with a special marker
    const processed = content.replace(
      /\{\{(.*?):(.*?)\}\}/g,
      (match, text, comment) => {
        return `<span class="highlight" data-comment="${comment}">${text}</span>`;
      }
    );
    setProcessedContent(processed);
  }, [content]);

  const components: Components = {
    span: ({ className, children, ...props }) => {
      if (className === "highlight") {
        const comment = (props as any)["data-comment"];
        return (
          <span
            className="bg-yellow-100 hover:bg-yellow-200 px-1 rounded transition-colors duration-200 cursor-help"
            title={comment}
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
