"use client";

import { useCallback, useEffect, useState } from "react";

import type { Comment, Document } from "@/types/documentSchema";
import {
  calculateCommentPositions,
  checkHighlightsReady,
} from "@/utils/ui/commentPositioning";
import { getValidAndSortedComments } from "@/utils/ui/commentUtils";
import { COMMENT_MIN_GAP } from "../constants";
import type { EvaluationState } from "../types";

import { PositionedComment } from "./PositionedComment";

interface CommentsColumnProps {
  comments: (Comment & { agentName?: string })[];
  contentRef: React.RefObject<HTMLDivElement | null>;
  selectedCommentId: string | null;
  hoveredCommentId: string | null;
  onCommentHover: (commentId: string | null) => void;
  onCommentClick: (commentId: string) => void;
  // Props for agent pills
  document?: Document;
  evaluationState?: EvaluationState;
  onEvaluationStateChange?: (newState: EvaluationState) => void;
}

export function CommentsColumn({
  comments,
  contentRef,
  selectedCommentId,
  hoveredCommentId,
  onCommentHover,
  onCommentClick,
  document,
  evaluationState,
  onEvaluationStateChange,
}: CommentsColumnProps) {
  const [commentPositions, setCommentPositions] = useState<
    Record<string, number>
  >({});
  const [highlightsReady, setHighlightsReady] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Get valid and sorted comments
  const sortedComments = getValidAndSortedComments(comments);

  // Calculate comment positions
  const calculatePositions = useCallback(
    (currentHoveredId?: string | null) => {
      if (!contentRef.current) return;

      const positions = calculateCommentPositions(
        sortedComments,
        contentRef.current,
        {
          hoveredCommentId: currentHoveredId,
          minGap: COMMENT_MIN_GAP,
        }
      );

      setCommentPositions(positions);
    },
    [sortedComments]
  );

  // Check if highlights are ready
  useEffect(() => {
    if (!contentRef.current) return;

    // Reset states when comments change
    setHighlightsReady(false);
    setHasInitialized(false);

    let attempts = 0;
    const maxAttempts = 10;

    const checkHighlights = () => {
      if (!contentRef.current) return;

      attempts++;
      const isReady = checkHighlightsReady(
        contentRef.current,
        sortedComments.length
      );

      if (isReady) {
        setHighlightsReady(true);
      } else if (attempts < maxAttempts) {
        setTimeout(checkHighlights, 100);
      }
    };

    // Initial delay to allow SlateEditor to render
    setTimeout(checkHighlights, 500);
  }, [sortedComments.length, contentRef]);

  // Calculate positions when highlights are ready
  useEffect(() => {
    if (highlightsReady) {
      calculatePositions(hoveredCommentId);
      // Mark as initialized after first position calculation
      if (!hasInitialized) {
        setTimeout(() => setHasInitialized(true), 50);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightsReady, sortedComments.length]);

  // Handle scroll events to recalculate if needed
  useEffect(() => {
    const container = contentRef.current;
    if (!container || !highlightsReady) return;

    const handleScroll = () => {
      // Optionally recalculate positions on scroll if needed
      // For now, positions are relative to container so no need to recalculate
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [contentRef, highlightsReady]);

  // Handle resize/zoom events
  useEffect(() => {
    if (!highlightsReady) return;

    let resizeTimeout: NodeJS.Timeout;
    let lastDevicePixelRatio = window.devicePixelRatio;

    const handleResize = () => {
      // Debounce resize events
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        calculatePositions(hoveredCommentId);
      }, 100);
    };

    // Check for zoom changes
    const checkZoom = () => {
      if (window.devicePixelRatio !== lastDevicePixelRatio) {
        lastDevicePixelRatio = window.devicePixelRatio;
        handleResize();
      }
    };

    // Listen for resize events
    window.addEventListener("resize", handleResize);

    // Poll for zoom changes (since there's no native zoom event)
    const zoomInterval = setInterval(checkZoom, 500);

    return () => {
      window.removeEventListener("resize", handleResize);
      clearInterval(zoomInterval);
      clearTimeout(resizeTimeout);
    };
  }, [highlightsReady, calculatePositions, hoveredCommentId]);

  return (
    <div style={{ width: "600px", flexShrink: 0 }}>
      <div className="relative overflow-hidden" style={{ minHeight: "100%" }}>
        {!highlightsReady && sortedComments.length > 0 && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="mb-3 h-8 w-8 animate-spin rounded-full border-b-2 border-gray-500"></div>
            <div className="text-sm text-gray-500">Loading comments...</div>
          </div>
        )}
        {sortedComments.map((comment, index) => {
          const tag = index.toString();
          const position = commentPositions[tag] || 0;
          const isSelected = selectedCommentId === tag;
          const isHovered = hoveredCommentId === tag;

          // Use a stable key based on comment content and agent
          const stableKey = `${(comment as any).agentId || "default"}-${comment.highlight.startOffset}-${comment.highlight.endOffset}`;

          return (
            <PositionedComment
              key={stableKey}
              comment={comment}
              index={index}
              position={position}
              isVisible={highlightsReady && hasInitialized && position > 0}
              isSelected={isSelected}
              isHovered={isHovered}
              onHover={onCommentHover}
              onClick={onCommentClick}
              agentName={(comment as any).agentName}
              skipAnimation={!hasInitialized}
            />
          );
        })}
      </div>
    </div>
  );
}
