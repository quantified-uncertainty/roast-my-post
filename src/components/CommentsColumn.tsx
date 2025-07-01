"use client";

import { useCallback, useEffect, useState } from "react";

import type { Comment, Evaluation } from "@/types/documentSchema";
import {
  calculateCommentPositions,
  checkHighlightsReady,
} from "@/utils/ui/commentPositioning";
import { getValidAndSortedComments } from "@/utils/ui/commentUtils";

import { PositionedComment } from "./PositionedComment";

interface CommentsColumnProps {
  comments: Comment[];
  evaluation: Evaluation;
  contentRef: React.RefObject<HTMLDivElement | null>;
  selectedCommentId: string | null;
  hoveredCommentId: string | null;
  commentColorMap: Record<number, { background: string; color: string }>;
  onCommentHover: (commentId: string | null) => void;
  onCommentClick: (commentId: string) => void;
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
}: CommentsColumnProps) {
  const [commentPositions, setCommentPositions] = useState<
    Record<string, number>
  >({});
  const [highlightsReady, setHighlightsReady] = useState(false);
  const [positionsCalculated, setPositionsCalculated] = useState(false);

  // Get valid and sorted comments
  const sortedComments = getValidAndSortedComments(comments);

  // Calculate comment positions
  const calculatePositions = useCallback(() => {
    if (!contentRef.current) return;

    const positions = calculateCommentPositions(
      sortedComments,
      contentRef.current,
      {
        hoveredCommentId,
        minGap: 10,
      }
    );

    setCommentPositions(positions);
    setPositionsCalculated(true);
  }, [sortedComments, contentRef, hoveredCommentId]);

  // Check if highlights are ready
  useEffect(() => {
    if (!contentRef.current) return;

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
    setTimeout(checkHighlights, 200);
  }, [sortedComments.length, contentRef]);

  // Calculate positions when highlights are ready
  useEffect(() => {
    if (highlightsReady) {
      setTimeout(calculatePositions, 100);
    }
  }, [highlightsReady, calculatePositions]);

  // Recalculate positions when hover changes
  useEffect(() => {
    if (highlightsReady && positionsCalculated) {
      calculatePositions();
    }
  }, [
    hoveredCommentId,
    calculatePositions,
    highlightsReady,
    positionsCalculated,
  ]);

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
      <div className="relative overflow-hidden" style={{ minHeight: "100%" }}>
        {sortedComments.map((comment, index) => {
          const tag = index.toString();
          const position = commentPositions[tag] || 0;
          const isSelected = selectedCommentId === tag;
          const isHovered = hoveredCommentId === tag;

          return (
            <PositionedComment
              key={tag}
              comment={comment}
              index={index}
              position={position}
              isVisible={positionsCalculated}
              isSelected={isSelected}
              isHovered={isHovered}
              colorMap={
                commentColorMap[index] || { background: "#gray", color: "#fff" }
              }
              onHover={onCommentHover}
              onClick={onCommentClick}
            />
          );
        })}
      </div>
    </div>
  );
}
