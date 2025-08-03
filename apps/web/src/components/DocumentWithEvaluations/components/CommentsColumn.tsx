"use client";

import { useCallback, useEffect, useState, useMemo, useRef } from "react";

import type { Document } from "@roast/ai";
import type { Comment as DbComment } from "@/types/databaseTypes";
import { dbCommentToAiComment } from "@/lib/typeAdapters";
import {
  calculateCommentPositions,
  checkHighlightsReady,
} from "@/utils/ui/commentPositioning";
import { getValidAndSortedComments } from "@/utils/ui/commentUtils";
import {
  COMMENT_MIN_GAP,
  COMMENT_COLUMN_WIDTH,
  HIGHLIGHT_CHECK_INTERVAL,
  HIGHLIGHT_CHECK_MAX_ATTEMPTS,
  RESIZE_DEBOUNCE_DELAY,
  INITIALIZATION_DELAY,
} from "../constants";
import type { EvaluationState } from "../types";

import { PositionedComment } from "./PositionedComment";
import { CommentErrorBoundary } from "./CommentErrorBoundary";

interface CommentsColumnProps {
  comments: (DbComment & { agentName?: string })[];
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

  // Get valid and sorted comments with memoization
  const sortedComments = useMemo(
    () => getValidAndSortedComments(comments) as (DbComment & { agentName?: string })[],
    [comments]
  );

  // Calculate comment positions
  const calculatePositions = useCallback(() => {
    if (!contentRef.current) return;

    const positions = calculateCommentPositions(
      sortedComments,
      contentRef.current,
      {
        hoveredCommentId: hoveredCommentId,
        minGap: COMMENT_MIN_GAP,
      }
    );

    setCommentPositions(positions);
  }, [sortedComments, contentRef, hoveredCommentId]);

  // Check if highlights are ready using polling
  useEffect(() => {
    if (!contentRef.current || sortedComments.length === 0) {
      setHighlightsReady(true); // No comments means we're ready
      return;
    }

    // Reset states when comments change
    setHighlightsReady(false);
    setHasInitialized(false);

    let attempts = 0;
    const maxAttempts = HIGHLIGHT_CHECK_MAX_ATTEMPTS;
    
    const checkHighlights = () => {
      if (!contentRef.current) return;
      
      attempts++;
      const ready = checkHighlightsReady(
        contentRef.current,
        sortedComments.length
      );
      
      if (ready || attempts >= maxAttempts) {
        setHighlightsReady(true);
      } else {
        // Continue checking
        setTimeout(checkHighlights, HIGHLIGHT_CHECK_INTERVAL);
      }
    };
    
    // Initial check
    setTimeout(checkHighlights, 100);
    
  }, [sortedComments.length, contentRef]);

  // Calculate positions when highlights are ready
  useEffect(() => {
    if (highlightsReady) {
      calculatePositions();
      // Mark as initialized after first position calculation
      if (!hasInitialized) {
        setTimeout(() => setHasInitialized(true), INITIALIZATION_DELAY);
      }
    }
  }, [highlightsReady, calculatePositions, hasInitialized]);

  // Handle resize events
  useEffect(() => {
    if (!highlightsReady || !contentRef.current) return;

    let resizeTimeout: NodeJS.Timeout;

    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        calculatePositions();
      }, RESIZE_DEBOUNCE_DELAY);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(resizeTimeout);
    };
  }, [highlightsReady, calculatePositions, contentRef]);

  return (
    <CommentErrorBoundary>
      <div style={{ width: `${COMMENT_COLUMN_WIDTH}px`, flexShrink: 0 }}>
        <div className="relative" style={{ minHeight: "100%" }}>
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

            return (
              <PositionedComment
                key={comment.id || `${comment.agentName || "default"}-${index}`}
                comment={dbCommentToAiComment(comment)}
                index={index}
                position={position}
                isVisible={highlightsReady && hasInitialized && position > 0}
                isSelected={isSelected}
                isHovered={isHovered}
                onHover={onCommentHover}
                onClick={onCommentClick}
                agentName={comment.agentName || "Unknown"}
                skipAnimation={!hasInitialized}
              />
            );
          })}
        </div>
      </div>
    </CommentErrorBoundary>
  );
}