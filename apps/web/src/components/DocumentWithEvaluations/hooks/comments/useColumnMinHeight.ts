import { useMemo } from "react";
import type { Comment } from "@/shared/types/databaseTypes";

interface UseColumnMinHeightOptions {
  comments: Comment[];
  commentPositions: Record<string, number>;
}

/**
 * Hook to compute the minimum height needed for the comments column container
 * by finding the last positioned comment and using its bottom edge.
 */
export function useColumnMinHeight({
  comments,
  commentPositions,
}: UseColumnMinHeightOptions): number {
  return useMemo(() => {
    if (!comments.length) return 0;

    // Find the lowest positioned comment
    const positions = Object.values(commentPositions);
    if (positions.length === 0) return 0;

    const lowestPosition = Math.max(...positions);
    const height = 80; // Simple estimate
    const padding = 20;

    return Math.ceil(lowestPosition + height + padding);
  }, [comments, commentPositions]);
}
