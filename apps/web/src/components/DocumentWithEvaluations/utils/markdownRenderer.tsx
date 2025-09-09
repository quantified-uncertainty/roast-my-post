import React from "react";
import ReactMarkdown from "react-markdown";
import { MARKDOWN_COMPONENTS, MARKDOWN_PLUGINS } from "../config/markdown";

/**
 * Pre-renders markdown content to React elements
 * This allows us to render once and reuse the result multiple times
 */
export function renderMarkdownToReact(content: string | undefined): React.ReactElement | null {
  if (!content) return null;
  
  return (
    <ReactMarkdown
      {...MARKDOWN_PLUGINS}
      components={MARKDOWN_COMPONENTS}
    >
      {content}
    </ReactMarkdown>
  );
}

/**
 * Cache for rendered markdown content
 * Key is the markdown string, value is the rendered React element
 */
const markdownCache = new Map<string, React.ReactElement>();

/**
 * Renders markdown with caching
 * Same content will only be processed once
 */
export function renderMarkdownCached(content: string | undefined): React.ReactElement | null {
  if (!content) return null;
  
  // Check cache first
  const cached = markdownCache.get(content);
  if (cached) return cached;
  
  // Render and cache
  const rendered = renderMarkdownToReact(content);
  if (rendered) {
    markdownCache.set(content, rendered);
  }
  
  return rendered;
}

/**
 * Clear the markdown cache (useful for memory management)
 */
export function clearMarkdownCache(): void {
  markdownCache.clear();
}