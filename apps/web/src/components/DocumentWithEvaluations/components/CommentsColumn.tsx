"use client";

import { useMemo, useRef, useState, useEffect } from "react";

import type { Document } from "@roast/ai";
import type { Comment as DbComment } from "@/shared/types/databaseTypes";
import { dbCommentToAiComment } from "@/shared/utils/typeAdapters";
import { getValidAndSortedComments } from "@/shared/utils/ui/commentUtils";
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

  // Add timeout to show error state if highlights fail
  const [loadingState, setLoadingState] = useState<'loading' | 'error' | 'ready'>('loading');
  const [loadingStartTime] = useState(Date.now());
  
  useEffect(() => {
    if (highlightsReady || sortedComments.length === 0) {
      setLoadingState('ready');
    } else if (!highlightsReady && sortedComments.length > 0) {
      // Check if we've been loading for too long
      const checkTimeout = setInterval(() => {
        const elapsed = Date.now() - loadingStartTime;
        if (elapsed > 5000) { // 5 seconds
          console.warn('Highlights not ready after timeout, showing error state');
          console.warn('Debug info:', {
            highlightsReady,
            hasInitialized,
            commentCount: sortedComments.length,
            highlightCacheSize: highlightCache.size
          });
          setLoadingState('error');
          clearInterval(checkTimeout);
        }
      }, 500); // Check every 500ms
      
      return () => clearInterval(checkTimeout);
    }
  }, [highlightsReady, sortedComments.length, loadingStartTime, hasInitialized, highlightCache.size]);

  const shouldShowComments = highlightsReady || loadingState === 'error';

  return (
    <CommentErrorBoundary>
      <div 
        ref={columnRef}
        style={{ width: `${COMMENT_COLUMN_WIDTH}px`, flexShrink: 0 }}
      >
        <div className="relative" style={{ minHeight: "100%" }}>
          {/* No comments message */}
          {sortedComments.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="mb-3 text-2xl text-gray-400">💬</div>
              <div className="text-sm text-gray-500">No comments available</div>
              <div className="mt-2 text-xs text-gray-400">
                Run an evaluation to generate comments
              </div>
            </div>
          )}
          
          {!shouldShowComments && sortedComments.length > 0 && (
            <div className="flex flex-col items-center justify-center py-12">
              {loadingState === 'loading' ? (
                <>
                  <div className="mb-3 h-8 w-8 animate-spin rounded-full border-b-2 border-gray-500"></div>
                  <div className="text-sm text-gray-500">Loading comments...</div>
                </>
              ) : (
                <>
                  <div className="mb-3 text-2xl text-orange-500">⚠️</div>
                  <div className="text-sm font-medium text-gray-700">Unable to position comments</div>
                  <div className="mt-2 max-w-xs text-center text-xs text-gray-500">
                    The highlighted text couldn't be found at the expected positions in the document. Comments will be shown without highlights.
                  </div>
                  <button
                    onClick={() => setLoadingState('ready')}
                    className="mt-4 rounded-md bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100"
                  >
                    Show comments anyway
                  </button>
                </>
              )}
            </div>
          )}
          
          {/* Show warning if comments are displayed without proper positioning */}
          {shouldShowComments && loadingState === 'error' && sortedComments.length > 0 && (
            <div className="mb-4 rounded-md bg-orange-50 border border-orange-200 p-3">
              <div className="flex items-start">
                <span className="text-orange-600 mr-2">⚠️</span>
                <div className="text-xs text-orange-800">
                  <p className="font-medium">Comments shown without highlights</p>
                  <p className="mt-1 text-orange-700">
                    The text positions don't match the current document. This might happen if the document was modified after analysis.
                  </p>
                </div>
              </div>
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
                isVisible={shouldShowComments && hasInitialized && (position > 0 || loadingState === 'error')}
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