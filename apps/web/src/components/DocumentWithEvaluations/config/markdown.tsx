import React from "react";

import rehypeRaw from "rehype-raw";
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
  a: ({ node: _node, ...props }: MarkdownComponentProps) => (
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
  
  // Table components
  table: ({ children, ...props }: MarkdownComponentProps) => (
    <div className="my-6 w-full overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 border border-gray-200" {...props}>
        {children}
      </table>
    </div>
  ),
  
  thead: ({ children, ...props }: MarkdownComponentProps) => (
    <thead className="bg-gray-50" {...props}>
      {children}
    </thead>
  ),
  
  tbody: ({ children, ...props }: MarkdownComponentProps) => (
    <tbody className="divide-y divide-gray-200 bg-white" {...props}>
      {children}
    </tbody>
  ),
  
  tr: ({ children, ...props }: MarkdownComponentProps) => (
    <tr className="hover:bg-gray-50 transition-colors" {...props}>
      {children}
    </tr>
  ),
  
  th: ({ children, align, ...props }: MarkdownComponentProps) => (
    <th 
      className={`px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${
        align === 'center' ? 'text-center' : 
        align === 'right' ? 'text-right' : 
        'text-left'
      }`}
      {...props}
    >
      {children}
    </th>
  ),
  
  td: ({ children, align, rowSpan, ...props }: MarkdownComponentProps) => (
    <td 
      className={`px-4 py-3 text-sm text-gray-900 align-top ${
        align === 'center' ? 'text-center' : 
        align === 'right' ? 'text-right' : 
        'text-left'
      }`}
      rowSpan={rowSpan}
      {...props}
    >
      {children}
    </td>
  ),
};

export const INLINE_MARKDOWN_COMPONENTS = {
  ...MARKDOWN_COMPONENTS,
  p: ({ children }: MarkdownComponentProps) => <>{children}</>,
};
