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
    <details
      className="my-6 border-l-4 border-gray-200 pl-4 transition-colors open:border-gray-300"
      {...props}
    >
      {children}
    </details>
  ),

  summary: ({ children, ...props }: MarkdownComponentProps) => (
    <summary
      className="cursor-pointer py-2 font-bold hover:text-gray-800 hover:underline focus:text-gray-800 focus:outline-none"
      {...props}
    >
      {children}
    </summary>
  ),
};

export const INLINE_MARKDOWN_COMPONENTS = {
  ...MARKDOWN_COMPONENTS,
  p: ({ children }: MarkdownComponentProps) => <>{children}</>,
};
