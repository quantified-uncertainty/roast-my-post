"use client";

import React, { useEffect, useRef, useState } from "react";
import { logger } from "@/lib/logger";

import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";

import { Comment } from "@/types/documentSchema";
import {
  applyHighlightsToContainer,
  resetContainer,
  testFindTextInContainer,
} from "@/utils/ui/highlightUtils";

interface HighlightedMarkdownProps {
  content: string;
  onHighlightHover: (tag: string | null) => void;
  onHighlightClick: (tag: string) => void;
  highlightColors: Record<string, string>;
  activeTag: string | null;
  highlights?: Comment[];
  analysisId?: string; // Identifier to detect when analysis changes
}

interface HighlightDataset extends DOMStringMap {
  tag?: string;
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
  // Store previous active tag to avoid unnecessary re-renders
  const [appliedHighlights, setAppliedHighlights] = useState<boolean>(false);

  // Update the key when content or analysis changes to force complete re-render
  useEffect(() => {
    if (analysisId) {
      setContentKey(`content-${analysisId}-${Date.now()}`);
      setRendered(false);
      setAppliedHighlights(false);
    }
  }, [analysisId, content]);

  // Apply highlights after content is rendered - only once per set of highlights
  useEffect(() => {
    if (!containerRef.current || !rendered || appliedHighlights) {
      return;
    }


    try {
      if (highlights && highlights.length > 0) {
        // Enhanced debugging for highlights
        highlights.forEach((highlight, index) => {
          const { startOffset, endOffset, quotedText } = highlight.highlight;

        });

        // Try to find the content text in the container for a reliable check
        if (containerRef.current && containerRef.current.textContent) {
          const contentTextInContainer = containerRef.current.textContent;
        }

        applyHighlightsToContainer(
          containerRef.current,
          highlights,
          highlightColors,
          false
        );
        setAppliedHighlights(true);
      } else {
        resetContainer(containerRef.current);
        setAppliedHighlights(true);
      }
    } catch (error) {
      console.error(`[HighlightedMarkdown] Error applying highlights:`, error);
      // Silently fail
    }
  }, [highlights, highlightColors, rendered, contentKey, appliedHighlights]);

  // Optimize to prevent re-renders on hover state changes
  const updateHoverStateClass = useEffect(() => {
    if (!containerRef.current || !appliedHighlights) return;

    try {
      // Instead of reapplying highlights, just update the active class
      const allHighlights = containerRef.current.querySelectorAll("[data-tag]");
      allHighlights.forEach((el) => {
        const highlightEl = el as HTMLElement;
        const dataset = highlightEl.dataset as HighlightDataset;
        const tag = dataset["tag"];

        // Add/remove active class based on the active tag
        if (tag === activeTag) {
          highlightEl.classList.add("highlight-active");
        } else {
          highlightEl.classList.remove("highlight-active");
        }
      });

      // Add click event listeners to all highlights
      allHighlights.forEach((el) => {
        const highlightEl = el as HTMLElement;
        const dataset = highlightEl.dataset as HighlightDataset;
        const tag = dataset["tag"];

        // Add/remove active class based on the active tag
        if (tag === activeTag) {
          highlightEl.classList.add("highlight-active");
        } else {
          highlightEl.classList.remove("highlight-active");
        }
      });

    } catch (err) {
      console.error(`[HighlightedMarkdown] Error updating active state:`, err);
    }
  }, [activeTag, appliedHighlights]);


  return (
    <div
      key={contentKey}
      ref={containerRef}
      className="prose-md prose prose-slate max-w-none"
      onClick={(e: React.MouseEvent<HTMLDivElement>) => {
        const target = e.target as HTMLElement;
        if (target.dataset["tag"]) {
          onHighlightClick(target.dataset["tag"]);
        }
      }}
      onMouseOver={(e: React.MouseEvent<HTMLDivElement>) => {
        const target = e.target as HTMLElement;
        if (target.dataset["tag"]) {
          onHighlightHover(target.dataset["tag"]);
        }
      }}
      onMouseOut={() => {
        onHighlightHover(null);
      }}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
        {content}
      </ReactMarkdown>
      <div
        style={{ display: "none" }}
        ref={() => {
          setRendered(true);
        }}
      />
    </div>
  );
}
