// @ts-ignore - ESM modules are handled by Next.js
import ReactMarkdown from "react-markdown";
import {
  MARKDOWN_PLUGINS,
  MARKDOWN_COMPONENTS,
  INLINE_MARKDOWN_COMPONENTS,
} from "../config/markdown";

interface MarkdownRendererProps {
  children: string;
  className?: string;
}

export function MarkdownRenderer({
  children,
  className = "",
}: MarkdownRendererProps) {
  const isInline = className.includes("inline");
  
  return (
    <div className={`${className} ${isInline ? "[&_p]:m-0 [&_p]:inline" : ""}`}>
      <ReactMarkdown
        {...MARKDOWN_PLUGINS}
        components={isInline ? INLINE_MARKDOWN_COMPONENTS : MARKDOWN_COMPONENTS}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}