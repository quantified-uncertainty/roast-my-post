import React from "react";

import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";

function MarkdownRenderer({
  children,
  className = "",
}: {
  children: string;
  className?: string;
}) {
  const isInline = className.includes("inline");

  const markdownProps = {
    remarkPlugins: [remarkGfm],
    rehypePlugins: [rehypeRaw],
    disallowedElements: isInline ? ["p"] : [],
    unwrapDisallowed: isInline,
    components: {
      a: ({ node, ...props }: any) => (
        <a
          {...props}
          className="text-blue-600 hover:text-blue-800 hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        />
      ),
    },
  };

  if (isInline) {
    return (
      <span className={className}>
        <ReactMarkdown {...markdownProps}>{children}</ReactMarkdown>
      </span>
    );
  }

  return (
    <div className={className}>
      <ReactMarkdown {...markdownProps}>{children}</ReactMarkdown>
    </div>
  );
}

export default MarkdownRenderer;