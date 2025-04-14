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
import {
  applyHighlightsToContainer,
  resetContainer,
} from '@/utils/highlightUtils';

interface HighlightedMarkdownProps {
  content: string;
  onHighlightHover: (tag: string | null) => void;
  onHighlightClick: (tag: string) => void;
  highlightColors: Record<string, string>;
  activeTag: string | null;
  highlights?: Comment[];
  analysisId?: string; // Identifier to detect when analysis changes
}

export function HighlightedMarkdown({
  content,
  onHighlightHover,
  onHighlightClick,
  highlightColors,
  activeTag,
  highlights,
  analysisId,
}: HighlightedMarkdownProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [rendered, setRendered] = useState(false);
  // Key used to force re-rendering when analysis changes
  const [contentKey, setContentKey] = useState<string>("initial");

  // Update the key when content or analysis changes to force complete re-render
  useEffect(() => {
    if (analysisId) {
      setContentKey(`content-${analysisId}-${Date.now()}`);
      setRendered(false);
    }
  }, [analysisId, content]);

  // Apply highlights after content is rendered
  useEffect(() => {
    if (!containerRef.current || !rendered) return;

    try {
      if (highlights && highlights.length > 0) {
        applyHighlightsToContainer(
          containerRef.current,
          highlights,
          highlightColors,
          false
        );
      } else {
        resetContainer(containerRef.current);
      }
    } catch (error) {
      // Silently fail
    }
  }, [highlights, highlightColors, rendered, contentKey]);

  return (
    <div
      key={contentKey}
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
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
        {content}
      </ReactMarkdown>
      <div style={{ display: "none" }} ref={() => setRendered(true)} />
    </div>
  );
}
