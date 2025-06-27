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
      a: ({ node, href, className, ...props }: any) => {
        // Handle footnote references (forward links like [1])
        if (href?.startsWith('#footnote-') && !href.includes('ref')) {
          return (
            <a
              href={href}
              {...props}
              className="text-blue-600 hover:text-blue-800 text-xs align-super no-underline"
              onClick={(e) => {
                e.preventDefault();
                const footnoteId = href.replace('#', '');
                const footnoteEl = document.getElementById(footnoteId);
                if (footnoteEl) {
                  footnoteEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
              }}
            />
          );
        }
        
        // Handle footnote back-references
        if (href?.startsWith('#footnote-ref-')) {
          return (
            <a
              href={href}
              {...props}
              className="text-blue-600 hover:text-blue-800 text-xs align-super no-underline ml-1"
              onClick={(e) => {
                e.preventDefault();
                const refId = href.replace('#', '');
                const refEl = document.getElementById(refId);
                if (refEl) {
                  refEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
              }}
            />
          );
        }
        
        return (
          <a
            href={href}
            {...props}
            className="text-blue-600 hover:text-blue-800 hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          />
        );
      },
      span: ({ node, id, ...props }: any) => {
        // Render spans with IDs (for footnote targets)
        if (id) {
          return <span id={id} {...props} />;
        }
        return <span {...props} />;
      },
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