"use client";

import { useMemo, useRef, useState, useEffect } from "react";

import type { Document } from "@roast/ai";
import type { Comment as DbComment } from "@/types/databaseTypes";
import { dbCommentToAiComment } from "@/lib/typeAdapters";
import { getValidAndSortedComments } from "@/utils/ui/commentUtils";
import { COMMENT_COLUMN_WIDTH } from "../constants";
import type { EvaluationState } from "../types";

import { PositionedComment } from "./PositionedComment";
import { CommentErrorBoundary } from "./CommentErrorBoundary";
import { useVirtualScrolling } from "../hooks/comments/useVirtualScrolling";
import { useHighlightDetection } from "../hooks/comments/useHighlightDetection";
import { useCommentPositions } from "../hooks/comments/useCommentPositions";

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

// Virtual scrolling constants
const VIRTUAL_OVERSCAN = 5; // Render 5 comments above/below viewport
const VIRTUAL_ITEM_HEIGHT_ESTIMATE = 80; // Estimated height for initial render

export function CommentsColumn({
  comments,
  contentRef,
  selectedCommentId,
  hoveredCommentId,
  onCommentHover,
  onCommentClick,
  document: _document,
  evaluationState: _evaluationState,
  onEvaluationStateChange: _onEvaluationStateChange,
}: CommentsColumnProps) {
  const columnRef = useRef<HTMLDivElement>(null);

  // Get valid and sorted comments with memoization
  const sortedComments = useMemo(
    () => getValidAndSortedComments(comments) as (DbComment & { agentName?: string })[],
    [comments]
  );

  // Use custom hooks for highlight detection and positioning
  const { highlightsReady, hasInitialized, highlightCache } = useHighlightDetection(
    contentRef,
    sortedComments.length
  );

  const { positions: commentPositions } = useCommentPositions(
    sortedComments,
    contentRef,
    {
      hoveredCommentId,
      highlightCache,
      enabled: highlightsReady,
    }
  );

  // Use virtual scrolling hook
  const { visibleItems: visibleComments, startSpacer, endSpacer } = useVirtualScrolling(
    sortedComments,
    columnRef,
    {
      itemHeight: VIRTUAL_ITEM_HEIGHT_ESTIMATE,
      overscan: VIRTUAL_OVERSCAN,
      enabled: highlightsReady,
    }
  );

  // Memoize comment conversion to avoid repeated conversions
  const convertedComments = useMemo(() => {
    return visibleComments.map(({ item }) => dbCommentToAiComment(item));
  }, [visibleComments]);

  // Add timeout to show comments even if highlights fail
  const [showCommentsAnyway, setShowCommentsAnyway] = useState(false);
  useEffect(() => {
    if (!highlightsReady && sortedComments.length > 0 && hasInitialized) {
      // If highlights haven't loaded after initialization, show comments anyway
      const timeout = setTimeout(() => {
        console.warn('Highlights not ready after timeout, showing comments anyway');
        setShowCommentsAnyway(true);
      }, 3000); // 3 second timeout
      return () => clearTimeout(timeout);
    }
  }, [highlightsReady, sortedComments.length, hasInitialized]);

  const shouldShowComments = highlightsReady || showCommentsAnyway;

  return (
    <CommentErrorBoundary>
      <div 
        ref={columnRef}
        style={{ width: `${COMMENT_COLUMN_WIDTH}px`, flexShrink: 0 }}
      >
        <div className="relative" style={{ minHeight: "100%" }}>
          {!shouldShowComments && sortedComments.length > 0 && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="mb-3 h-8 w-8 animate-spin rounded-full border-b-2 border-gray-500"></div>
              <div className="text-sm text-gray-500">Loading comments...</div>
              {showCommentsAnyway && (
                <div className="mt-2 text-xs text-orange-600">
                  Some highlights may not be positioned correctly
                </div>
              )}
            </div>
          )}
          
          {/* Virtual spacer for comments above visible range */}
          {startSpacer > 0 && (
            <div style={{ height: `${startSpacer}px` }} />
          )}
          
          {visibleComments.map(({ item: comment, originalIndex }, idx) => {
            const tag = originalIndex.toString();
            const position = commentPositions[tag] || 0;
            const isSelected = selectedCommentId === tag;
            const isHovered = hoveredCommentId === tag;

            return (
              <PositionedComment
                key={comment.id || `${comment.agentName || "default"}-${originalIndex}`}
                comment={convertedComments[idx]}
                index={originalIndex}
                position={position}
                isVisible={shouldShowComments && hasInitialized && (position > 0 || showCommentsAnyway)}
                isSelected={isSelected}
                isHovered={isHovered}
                onHover={onCommentHover}
                onClick={onCommentClick}
                agentName={comment.agentName || "Unknown"}
                skipAnimation={!hasInitialized}
              />
            );
          })}
          
          {/* Virtual spacer for comments below visible range */}
          {endSpacer > 0 && (
            <div style={{ height: `${endSpacer}px` }} />
          )}
        </div>
      </div>
    </CommentErrorBoundary>
  );
}