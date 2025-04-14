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
  analysisId?: string; // Add an identifier to detect when analysis changes
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
  const previousAnalysisIdRef = useRef<string | undefined>(undefined);

  // Apply highlights to the DOM after markdown content is rendered
  useEffect(() => {
    if (!containerRef.current || !rendered) return;

    // Check if we're switching between different analyses
    const isNewAnalysis = analysisId !== previousAnalysisIdRef.current;
    previousAnalysisIdRef.current = analysisId;

    if (highlights) {
      applyHighlightsToContainer(
        containerRef.current,
        highlights,
        highlightColors,
        isNewAnalysis // Force a reset when switching analyses
      );
    } else {
      // If no highlights provided, reset the container to its original state
      resetContainer(containerRef.current);
    }
  }, [highlights, highlightColors, rendered, analysisId]);

  // Reset when content changes
  useEffect(() => {
    if (containerRef.current) {
      resetContainer(containerRef.current);
    }
  }, [content]);

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
