import React from "react";
// @ts-ignore - ESM modules are handled by Next.js
import rehypeRaw from "rehype-raw";
// @ts-ignore - ESM modules are handled by Next.js
import remarkGfm from "remark-gfm";

export const MARKDOWN_PLUGINS = {
  remarkPlugins: [remarkGfm],
  rehypePlugins: [rehypeRaw],
};

interface MarkdownComponentProps {
  node?: any;
  children?: React.ReactNode;
  [key: string]: any;
}

export const MARKDOWN_COMPONENTS = {
  a: ({ node, ...props }: MarkdownComponentProps) => (
    <a
      {...props}
      className="text-blue-600 hover:text-blue-800 hover:underline"
      target="_blank"
      rel="noopener noreferrer"
    />
  ),
  p: ({ children }: MarkdownComponentProps) => (
    <div className="mb-1 last:mb-0">{children}</div>
  ),
  details: ({ children, ...props }: MarkdownComponentProps) => (
    <details {...props} className="[&[open]>*:not(summary)]:p-2 [&[open]>*:not(summary)]:bg-gray-50">
      {children}
    </details>
  ),
};

export const INLINE_MARKDOWN_COMPONENTS = {
  ...MARKDOWN_COMPONENTS,
  p: ({ children }: MarkdownComponentProps) => <>{children}</>,
};