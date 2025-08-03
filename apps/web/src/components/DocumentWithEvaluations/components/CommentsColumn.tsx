"use client";

import { useCallback, useEffect, useState, useMemo, useRef } from "react";

import type { Document } from "@roast/ai";
import type { Comment as AiComment } from "@roast/ai";
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
  
  // Refs for cleanup
  const rafRef = useRef<number>(0);
  const mutationDebounceRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const observerRef = useRef<MutationObserver | null>(null);
  const checkTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const initTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Position cache to avoid recalculating unchanged positions
  const positionCacheRef = useRef<{
    hoveredId: string | null;
    positions: Record<string, number>;
    commentCount: number;
  }>({ hoveredId: null, positions: {}, commentCount: 0 });

  // Get valid and sorted comments with memoization
  const sortedComments = useMemo(
    () => getValidAndSortedComments(comments) as (DbComment & { agentName?: string })[],
    [comments]
  );

  // Calculate comment positions with RAF for smooth updates
  const calculatePositions = useCallback(() => {
    if (!contentRef.current) return;

    // Cancel any pending animation frame
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
    
    // Use requestAnimationFrame for smooth updates
    rafRef.current = requestAnimationFrame(() => {
      if (!contentRef.current) return;
      
      // Check if we need to recalculate
      const cache = positionCacheRef.current;
      if (
        cache.hoveredId === hoveredCommentId &&
        cache.commentCount === sortedComments.length &&
        Object.keys(cache.positions).length === sortedComments.length
      ) {
        // Positions haven't changed, use cached values
        return;
      }
      
      const positions = calculateCommentPositions(
        sortedComments,
        contentRef.current,
        {
          hoveredCommentId: hoveredCommentId,
          minGap: COMMENT_MIN_GAP,
        }
      );

      // Update cache
      positionCacheRef.current = {
        hoveredId: hoveredCommentId,
        positions,
        commentCount: sortedComments.length,
      };
      
      setCommentPositions(positions);
    });
  }, [sortedComments, contentRef, hoveredCommentId]);

  // Check if highlights are ready using MutationObserver with debouncing
  useEffect(() => {
    if (!contentRef.current || sortedComments.length === 0) {
      setHighlightsReady(true); // No comments means we're ready
      return;
    }

    // Reset states when comments change
    setHighlightsReady(false);
    setHasInitialized(false);
    positionCacheRef.current = { hoveredId: null, positions: {}, commentCount: 0 };

    let isSubscribed = true;
    let attempts = 0;
    const maxAttempts = HIGHLIGHT_CHECK_MAX_ATTEMPTS;
    
    const debouncedCheck = () => {
      clearTimeout(mutationDebounceRef.current);
      mutationDebounceRef.current = setTimeout(() => {
        if (!isSubscribed || !contentRef.current) return;
        
        attempts++;
        const ready = checkHighlightsReady(
          contentRef.current,
          sortedComments.length
        );
        
        if (ready) {
          setHighlightsReady(true);
        } else if (attempts >= maxAttempts) {
          // Fallback: assume ready after max attempts
          console.warn('Max attempts reached for highlight detection');
          setHighlightsReady(true);
        }
      }, 100);
    };

    // More targeted observer for better performance
    observerRef.current = new MutationObserver(debouncedCheck);
    
    // Observe with more targeted options
    observerRef.current.observe(contentRef.current, {
      childList: true,
      subtree: true, // We need subtree to catch highlight elements
      attributes: true,
      attributeFilter: ['data-tag']
    });
    
    // Initial check
    checkTimeoutRef.current = setTimeout(debouncedCheck, 100);
    
    return () => {
      isSubscribed = false;
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
      if (mutationDebounceRef.current) {
        clearTimeout(mutationDebounceRef.current);
        mutationDebounceRef.current = undefined;
      }
      if (checkTimeoutRef.current) {
        clearTimeout(checkTimeoutRef.current);
        checkTimeoutRef.current = null;
      }
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
    };
  }, [sortedComments.length, contentRef]);

  // Calculate positions when highlights are ready or hover changes
  useEffect(() => {
    if (highlightsReady) {
      calculatePositions();
      // Mark as initialized after first position calculation
      if (!hasInitialized) {
        initTimeoutRef.current = setTimeout(() => setHasInitialized(true), INITIALIZATION_DELAY);
      }
    }
    
    return () => {
      if (initTimeoutRef.current) {
        clearTimeout(initTimeoutRef.current);
        initTimeoutRef.current = null;
      }
    };
  }, [highlightsReady, hasInitialized, calculatePositions]);

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

  // Handle resize/zoom events with ResizeObserver
  useEffect(() => {
    if (!highlightsReady || !contentRef.current) return;

    let lastWidth = 0;
    let lastHeight = 0;

    const handleResize = (entries: ResizeObserverEntry[]) => {
      const entry = entries[0];
      if (!entry) return;

      const { width, height } = entry.contentRect;
      
      // Only recalculate if size changed significantly (5px threshold)
      if (Math.abs(width - lastWidth) > 5 || Math.abs(height - lastHeight) > 5) {
        lastWidth = width;
        lastHeight = height;
        
        // Debounce resize events
        if (resizeTimeoutRef.current) {
          clearTimeout(resizeTimeoutRef.current);
        }
        resizeTimeoutRef.current = setTimeout(() => {
          // Invalidate cache on resize
          positionCacheRef.current = { hoveredId: null, positions: {}, commentCount: 0 };
          calculatePositions();
        }, RESIZE_DEBOUNCE_DELAY);
      }
    };

    // Use ResizeObserver for efficient size change detection
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(contentRef.current);

    // Also observe window resize for zoom detection
    const handleWindowResize = () => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      resizeTimeoutRef.current = setTimeout(() => {
        // Invalidate cache on window resize
        positionCacheRef.current = { hoveredId: null, positions: {}, commentCount: 0 };
        calculatePositions();
      }, RESIZE_DEBOUNCE_DELAY);
    };

    window.addEventListener("resize", handleWindowResize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", handleWindowResize);
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
        resizeTimeoutRef.current = null;
      }
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

            // Use comment.id for stable key when available
            const stableKey = comment.id || `${comment.agentName || "default"}-${comment.highlight?.startOffset || 0}-${comment.highlight?.endOffset || 0}-${index}`;

            return (
              <PositionedComment
                key={stableKey}
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
