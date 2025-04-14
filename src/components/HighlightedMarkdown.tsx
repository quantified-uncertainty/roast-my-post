"use client";

import React, {
  useEffect,
  useRef,
  useState,
} from 'react';

import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';

import { Comment } from '@/types/documentReview';
import { applyHighlightsToContainer } from '@/utils/highlightUtils';

interface HighlightedMarkdownProps {
  content: string;
  onHighlightHover: (tag: string | null) => void;
  onHighlightClick: (tag: string) => void;
  highlightColors: Record<string, string>;
  activeTag: string | null;
  highlights?: Comment[];
}

export function HighlightedMarkdown({
  content,
  onHighlightHover,
  onHighlightClick,
  highlightColors,
  activeTag,
  highlights,
}: HighlightedMarkdownProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [rendered, setRendered] = useState(false);

  // Apply highlights to the DOM after markdown content is rendered
  useEffect(() => {
    if (!containerRef.current || !rendered || !highlights) return;

    applyHighlightsToContainer(
      containerRef.current,
      highlights,
      highlightColors
    );
  }, [highlights, highlightColors, rendered]);

  return (
    <div
      ref={containerRef}
      className="prose prose-slate prose-md max-w-none"
      onClick={(e: React.MouseEvent<HTMLDivElement>) => {
        const target = e.target as HTMLElement;
        if (target.dataset.tag) onHighlightClick(target.dataset.tag);
      }}
      onMouseOver={(e: React.MouseEvent<HTMLDivElement>) => {
        const target = e.target as HTMLElement;
        if (target.dataset.tag) onHighlightHover(target.dataset.tag);
      }}
      onMouseOut={() => onHighlightHover(null)}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        children={content}
      />
      {/* Wait for ReactMarkdown to finish rendering before applying highlights */}
      <div style={{ display: "none" }} ref={() => setRendered(true)} />
    </div>
  );
}
