import { useMemo } from "react";
import type { RefObject } from "react";
import type { Comment } from "@/shared/types/databaseTypes";

interface UseColumnMinHeightOptions {
  comments: Comment[];
  commentPositions: Record<string, number>;
  contentRef?: RefObject<HTMLDivElement | null>;
  allowedTags?: Set<string>;
}

/**
 * Hook to compute the minimum height needed for the comments column container
 * by finding the last positioned comment and using its bottom edge.
 */
export function useColumnMinHeight({
  comments,
  commentPositions,
  contentRef,
  allowedTags,
}: UseColumnMinHeightOptions): number {
  return useMemo(() => {
    if (!comments.length) return 0;

    // Find the lowest positioned comment
    const positions = Object.entries(commentPositions)
      .filter(([tag]) => !allowedTags || allowedTags.has(tag))
      .map(([, pos]) => pos);
    if (positions.length === 0) return 0;

    const lowestPosition = Math.max(...positions);
    const height = 80; // Simple estimate
    const padding = 20;

    const rawHeight = Math.ceil(lowestPosition + height + padding);

    // Clamp to content scrollHeight when available to avoid runaway growth
    const container = contentRef?.current;
    // Clamp in all modes with a generous cap to prevent runaway inflation
    if (container && container.scrollHeight > 0) {
      const MAX_MULTIPLIER = 2; // allow up to 2x document height
      const maxAllowed = Math.max(
        container.scrollHeight,
        Math.floor(container.scrollHeight * MAX_MULTIPLIER)
      );
      return Math.min(rawHeight, maxAllowed);
    }

    return rawHeight;
  }, [comments, commentPositions, contentRef, allowedTags]);
}
