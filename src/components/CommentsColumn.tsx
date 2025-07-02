"use client";

import { useCallback, useEffect, useState } from "react";

import type { Comment, Evaluation } from "@/types/documentSchema";
import {
  calculateCommentPositions,
  checkHighlightsReady,
} from "@/utils/ui/commentPositioning";
import { getValidAndSortedComments } from "@/utils/ui/commentUtils";

import { PositionedComment } from "./PositionedComment";
import { GradeBadge } from "./GradeBadge";

interface CommentsColumnProps {
  comments: (Comment & { agentName?: string })[];
  evaluation: Evaluation;
  contentRef: React.RefObject<HTMLDivElement | null>;
  selectedCommentId: string | null;
  hoveredCommentId: string | null;
  commentColorMap: Record<number, { background: string; color: string }>;
  onCommentHover: (commentId: string | null) => void;
  onCommentClick: (commentId: string) => void;
  // New props for agent pills
  document?: any;
  evaluationState?: any;
  onEvaluationStateChange?: (newState: any) => void;
  onEvaluationSelect?: (index: number) => void;
}

export function CommentsColumn({
  comments,
  evaluation,
  contentRef,
  selectedCommentId,
  hoveredCommentId,
  commentColorMap,
  onCommentHover,
  onCommentClick,
  document,
  evaluationState,
  onEvaluationStateChange,
  onEvaluationSelect,
}: CommentsColumnProps) {
  const [commentPositions, setCommentPositions] = useState<
    Record<string, number>
  >({});
  const [highlightsReady, setHighlightsReady] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Get valid and sorted comments
  const sortedComments = getValidAndSortedComments(comments);

  // Calculate comment positions
  const calculatePositions = useCallback((currentHoveredId?: string | null) => {
    if (!contentRef.current) return;

    const positions = calculateCommentPositions(
      sortedComments,
      contentRef.current,
      {
        hoveredCommentId: currentHoveredId,
        minGap: 10,
      }
    );

    setCommentPositions(positions);
  }, [sortedComments]);

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

  return (
    <div
      className="border-l border-gray-200 bg-gray-50"
      style={{ width: "600px", flexShrink: 0 }}
    >
      {/* Agent pills sticky header */}
      {document && evaluationState && (
        <div className="sticky top-0 z-20 border-b border-gray-200 bg-white px-4 py-3">
          <div className="flex flex-wrap gap-2">
            {document.reviews.map((review: any, index: number) => {
              const isActive = evaluationState.isMultiAgentMode 
                ? evaluationState.selectedAgentIds.has(review.agentId)
                : index === evaluationState.selectedReviewIndex;
              return (
                <button
                  key={review.agentId}
                  onClick={() => {
                    if (evaluationState.isMultiAgentMode && onEvaluationStateChange) {
                      // Toggle agent selection in multi-agent mode
                      const newSelectedIds = new Set(evaluationState.selectedAgentIds);
                      if (newSelectedIds.has(review.agentId)) {
                        newSelectedIds.delete(review.agentId);
                      } else {
                        newSelectedIds.add(review.agentId);
                      }
                      onEvaluationStateChange({
                        ...evaluationState,
                        selectedAgentIds: newSelectedIds,
                      });
                    } else if (onEvaluationSelect) {
                      // Single agent selection
                      onEvaluationSelect(index);
                    }
                  }}
                  className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-blue-100 text-blue-700 ring-1 ring-blue-600"
                      : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-300"
                  }`}
                >
                  {review.agent.name}
                  {review.grade !== undefined && (
                    <GradeBadge grade={review.grade} variant="light" size="xs" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
      
      <div className="relative overflow-hidden" style={{ minHeight: "100%" }}>
        {sortedComments.map((comment, index) => {
          const tag = index.toString();
          const position = commentPositions[tag] || 0;
          const isSelected = selectedCommentId === tag;
          const isHovered = hoveredCommentId === tag;

          // Use a stable key based on comment content and agent
          const stableKey = `${(comment as any).agentId || 'default'}-${comment.highlight.startOffset}-${comment.highlight.endOffset}`;
          
          return (
            <PositionedComment
              key={stableKey}
              comment={comment}
              index={index}
              position={position}
              isVisible={highlightsReady && hasInitialized}
              isSelected={isSelected}
              isHovered={isHovered}
              colorMap={
                commentColorMap[index] || { background: "#gray", color: "#fff" }
              }
              onHover={onCommentHover}
              onClick={onCommentClick}
              agentName={(comment as any).agentName || evaluation.agent.name}
              skipAnimation={!hasInitialized}
            />
          );
        })}
      </div>
    </div>
  );
}
