"use client";

import { useEffect, useState } from "react";

import type { Components } from "react-markdown";
import Markdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";

interface HighlightedMarkdownProps {
  content: string;
  onHighlightHover?: (tag: string) => void;
  onHighlightClick?: (tag: string) => void;
  highlightColors?: Record<string, string>;
  activeTag?: string | null;
}

const colorClasses: Record<
  string,
  { base: string; hover: string; active: string }
> = {
  "red-100": {
    base: "bg-red-100",
    hover: "hover:bg-red-200",
    active: "bg-red-200",
  },
  "blue-100": {
    base: "bg-blue-100",
    hover: "hover:bg-blue-200",
    active: "bg-blue-200",
  },
  "green-100": {
    base: "bg-green-100",
    hover: "hover:bg-green-200",
    active: "bg-green-200",
  },
  "purple-100": {
    base: "bg-purple-100",
    hover: "hover:bg-purple-200",
    active: "bg-purple-200",
  },
  "yellow-100": {
    base: "bg-yellow-100",
    hover: "hover:bg-yellow-200",
    active: "bg-yellow-200",
  },
};

export function HighlightedMarkdown({
  content,
  onHighlightHover,
  onHighlightClick,
  highlightColors = {},
  activeTag,
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
        const colorKey = highlightColors[tag] || "yellow-100";
        const colorClass = colorClasses[colorKey] || colorClasses["yellow-100"];

        return (
          <span
            className={`${colorClass.base} ${
              colorClass.hover
            } px-1 rounded transition-colors duration-200 cursor-pointer ${
              activeTag === tag ? colorClass.active : ""
            }`}
            data-tag={tag}
            onMouseEnter={() => {
              console.log("Mouse enter with tag:", tag); // Debug log
              onHighlightHover?.(tag);
            }}
            onClick={() => {
              console.log("Click with tag:", tag); // Debug log
              onHighlightClick?.(tag);
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
