import React from "react";

import ReactMarkdown from "react-markdown";
import { 
  MARKDOWN_COMPONENTS, 
  INLINE_MARKDOWN_COMPONENTS, 
  MARKDOWN_PLUGINS 
} from "./DocumentWithEvaluations/config/markdown";

interface MarkdownRendererProps {
  children: string;
  className?: string;
  inline?: boolean;
  components?: Record<string, React.ComponentType<any>>;
}

function MarkdownRenderer({
  children,
  className = "",
  inline = false,
  components,
}: MarkdownRendererProps) {
  // Detect inline mode from className for backward compatibility
  const isInline = inline || className.includes("inline");

  const defaultComponents = isInline ? INLINE_MARKDOWN_COMPONENTS : MARKDOWN_COMPONENTS;
  const finalComponents = components || defaultComponents;

  const markdownProps = {
    ...MARKDOWN_PLUGINS,
    disallowedElements: isInline ? ["p"] : [],
    unwrapDisallowed: isInline,
    components: finalComponents,
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