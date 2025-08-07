import { useCallback, useEffect, useState, useRef, RefObject } from "react";
import type { Comment } from "@/shared/types/databaseTypes";
import { calculateCommentPositions } from "@/shared/utils/ui/commentPositioning";
import { COMMENT_MIN_GAP, RESIZE_DEBOUNCE_DELAY } from "../../constants";

export interface UseCommentPositionsOptions {
  hoveredCommentId: string | null;
  highlightCache: Map<string, HTMLElement>;
  enabled: boolean;
}

export interface UseCommentPositionsResult {
  positions: Record<string, number>;
  recalculate: () => void;
}

// Constants for position calculation
const POSITION_UPDATE_DELAY = 16; // ~60fps

/**
 * Hook to calculate and manage comment positions based on highlight elements.
 * Includes caching and debouncing for performance optimization.
 * 
 * @param comments - Array of comments to position
 * @param contentRef - Reference to the content container
 * @param options - Configuration options including hover state and cache
 * @returns Object with calculated positions and recalculate function
 */
export function useCommentPositions(
  comments: Comment[],
  contentRef: RefObject<HTMLDivElement | null>,
  options: UseCommentPositionsOptions
): UseCommentPositionsResult {
  const { hoveredCommentId, highlightCache, enabled } = options;
  const [positions, setPositions] = useState<Record<string, number>>({});
  
  // Performance optimization refs
  const positionCacheRef = useRef<Record<string, number>>({});
  const lastHoveredIdRef = useRef<string | null>(null);
  const positionDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Clear any pending position calculation
  const clearPendingCalculation = useCallback(() => {
    if (positionDebounceRef.current) {
      clearTimeout(positionDebounceRef.current);
      positionDebounceRef.current = null;
    }
  }, []);

  // Optimized position calculation with caching
  const calculatePositions = useCallback(() => {
    if (!contentRef.current || !enabled) return;

    clearPendingCalculation();

    positionDebounceRef.current = setTimeout(() => {
      // Check if recalculation is needed
      const hoveredChanged = lastHoveredIdRef.current !== hoveredCommentId;
      const cacheEmpty = Object.keys(positionCacheRef.current).length === 0;
      
      lastHoveredIdRef.current = hoveredCommentId;
      
      if (!hoveredChanged && !cacheEmpty) {
        // Use cached positions if hover hasn't changed
        setPositions(positionCacheRef.current);
        return;
      }

      // Calculate new positions
      const newPositions = calculateCommentPositions(
        comments,
        contentRef.current!,
        {
          hoveredCommentId,
          minGap: COMMENT_MIN_GAP,
          highlightCache,
        }
      );

      positionCacheRef.current = newPositions;
      setPositions(newPositions);
    }, POSITION_UPDATE_DELAY);
  }, [comments, contentRef, hoveredCommentId, highlightCache, enabled, clearPendingCalculation]);

  // Calculate positions when dependencies change
  useEffect(() => {
    if (enabled) {
      calculatePositions();
    }
  }, [calculatePositions, enabled]);

  // Handle resize events with debouncing
  useEffect(() => {
    if (!enabled || !contentRef.current) return;

    let resizeTimeout: NodeJS.Timeout;
    
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        // Invalidate cache and recalculate on resize
        positionCacheRef.current = {};
        calculatePositions();
      }, RESIZE_DEBOUNCE_DELAY);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(contentRef.current);

    return () => {
      resizeObserver.disconnect();
      clearTimeout(resizeTimeout);
    };
  }, [enabled, calculatePositions, contentRef]);

  // Cleanup on unmount
  useEffect(() => {
    return clearPendingCalculation;
  }, [clearPendingCalculation]);

  return {
    positions,
    recalculate: calculatePositions,
  };
}