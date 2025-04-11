"use client";

import { useEffect, useState } from "react";

import type { Components } from "react-markdown";
import Markdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";

interface HighlightedMarkdownProps {
  content: string;
  onHighlightHover?: (tag: string) => void;
  highlightColors?: Record<string, string>;
}

const colorClasses: Record<string, { base: string; hover: string }> = {
  "red-800": { base: "bg-red-800", hover: "hover:bg-red-700" },
  "blue-800": { base: "bg-blue-800", hover: "hover:bg-blue-700" },
  "green-800": { base: "bg-green-800", hover: "hover:bg-green-700" },
  "purple-800": { base: "bg-purple-800", hover: "hover:bg-purple-700" },
  "yellow-800": { base: "bg-yellow-800", hover: "hover:bg-yellow-700" },
};

export function HighlightedMarkdown({
  content,
  onHighlightHover,
  highlightColors = {},
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
        const colorKey = highlightColors[tag] || "yellow-800";
        const colorClass = colorClasses[colorKey] || colorClasses["yellow-800"];

        return (
          <span
            className={`${colorClass.base} ${colorClass.hover} px-1 rounded transition-colors duration-200 cursor-help`}
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
