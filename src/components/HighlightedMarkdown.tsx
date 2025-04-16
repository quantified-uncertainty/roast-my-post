"use client";

import React, { useEffect, useRef, useState } from "react";

// @ts-ignore - ESM modules are handled by Next.js
import ReactMarkdown from "react-markdown";
// @ts-ignore - ESM modules are handled by Next.js
import rehypeRaw from "rehype-raw";
// @ts-ignore - ESM modules are handled by Next.js
import remarkGfm from "remark-gfm";

import { Comment } from "@/types/documentReview";
import {
  applyHighlightsToContainer,
  resetContainer,
  testFindTextInContainer,
} from "@/utils/highlightUtils";

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
      console.log(
        `[HighlightedMarkdown] Setting new content key for analysisId: ${analysisId}`
      );
      setContentKey(`content-${analysisId}-${Date.now()}`);
      setRendered(false);
      setAppliedHighlights(false);
    }
  }, [analysisId, content]);

  // Apply highlights after content is rendered - only once per set of highlights
  useEffect(() => {
    if (!containerRef.current || !rendered || appliedHighlights) {
      console.log(
        `[HighlightedMarkdown] Skipping highlight application, container ready: ${!!containerRef.current}, rendered: ${rendered}, already applied: ${appliedHighlights}`
      );
      return;
    }

    console.log(
      `[HighlightedMarkdown] Applying highlights, count: ${
        highlights?.length || 0
      }`
    );

    try {
      if (highlights && highlights.length > 0) {
        // Enhanced debugging for highlights
        highlights.forEach((highlight, index) => {
          const { startOffset, endOffset, quotedText } = highlight.highlight;
          console.log(`[HighlightedMarkdown] Highlight ${index}:`, {
            title: highlight.title,
            startOffset,
            endOffset,
            quotedTextPreview: quotedText
              ? `${quotedText.substring(0, 50)}${
                  quotedText.length > 50 ? "..." : ""
                }`
              : "none",
          });

          // Debug: Test text finding for problematic highlight
          if (process.env.NODE_ENV === "development" && containerRef.current) {
            console.log(
              `[HighlightedMarkdown] Testing text match for highlight ${index}:`
            );
            const found = testFindTextInContainer(
              containerRef.current,
              quotedText
            );
            console.log(`[HighlightedMarkdown] Match found: ${found}`);
          }
        });

        // Try to find the content text in the container for a reliable check
        if (containerRef.current && containerRef.current.textContent) {
          const contentTextInContainer = containerRef.current.textContent;
          console.log(
            `[HighlightedMarkdown] Content length in container: ${contentTextInContainer.length}`
          );
          console.log(
            `[HighlightedMarkdown] DOM content sample: ${contentTextInContainer.substring(
              0,
              100
            )}...`
          );
        }

        applyHighlightsToContainer(
          containerRef.current,
          highlights,
          highlightColors,
          false
        );
        console.log(`[HighlightedMarkdown] Highlights applied successfully`);
        setAppliedHighlights(true);
      } else {
        console.log(
          `[HighlightedMarkdown] No highlights to apply, resetting container`
        );
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

      console.log(
        `[HighlightedMarkdown] Updated active state for tag: ${
          activeTag || "none"
        }`
      );
    } catch (err) {
      console.error(`[HighlightedMarkdown] Error updating active state:`, err);
    }
  }, [activeTag, appliedHighlights]);

  console.log(
    `[HighlightedMarkdown] Rendering with key: ${contentKey}, activeTag: ${
      activeTag || "none"
    }, appliedHighlights: ${appliedHighlights}`
  );

  return (
    <div
      key={contentKey}
      ref={containerRef}
      className="prose prose-slate prose-md max-w-none"
      onClick={(e: React.MouseEvent<HTMLDivElement>) => {
        const target = e.target as HTMLElement;
        if (target.dataset["tag"]) {
          console.log(
            `[HighlightedMarkdown] Click on highlight with tag: ${target.dataset["tag"]}`
          );
          onHighlightClick(target.dataset["tag"]);
        }
      }}
      onMouseOver={(e: React.MouseEvent<HTMLDivElement>) => {
        const target = e.target as HTMLElement;
        if (target.dataset["tag"]) {
          console.log(
            `[HighlightedMarkdown] Hover on highlight with tag: ${target.dataset["tag"]}`
          );
          onHighlightHover(target.dataset["tag"]);
        }
      }}
      onMouseOut={() => {
        console.log(`[HighlightedMarkdown] Mouse out, clearing hover`);
        onHighlightHover(null);
      }}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
        {content}
      </ReactMarkdown>
      <div
        style={{ display: "none" }}
        ref={() => {
          console.log(
            `[HighlightedMarkdown] Setting rendered=true via ref callback`
          );
          setRendered(true);
        }}
      />
    </div>
  );
}
