import React from "react";
// @ts-ignore - ESM modules are handled by Next.js
import rehypeRaw from "rehype-raw";
// @ts-ignore - ESM modules are handled by Next.js
import remarkGfm from "remark-gfm";

export const MARKDOWN_PLUGINS = {
  remarkPlugins: [remarkGfm],
  rehypePlugins: [rehypeRaw],
};

export const MARKDOWN_COMPONENTS = {
  a: ({ node, ...props }: any) => (
    <a
      {...props}
      className="text-blue-600 hover:text-blue-800 hover:underline"
      target="_blank"
      rel="noopener noreferrer"
    />
  ),
  p: ({ children }: any) => (
    <div className="mb-1 last:mb-0">{children}</div>
  ),
};

export const INLINE_MARKDOWN_COMPONENTS = {
  ...MARKDOWN_COMPONENTS,
  p: ({ children }: any) => <>{children}</>,
};