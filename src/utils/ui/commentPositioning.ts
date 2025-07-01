import type { Comment } from "@/types/documentSchema";

interface CommentPosition {
  id: string;
  position: number;
}

interface PositionCalculationOptions {
  minGap?: number;
  hoveredCommentId?: string | null;
  baseHeight?: number;
  charsPerLine?: number;
  lineHeight?: number;
}

/**
 * Calculate the positions of comments based on their highlight elements
 */
export function calculateCommentPositions(
  comments: Comment[],
  container: HTMLElement,
  options: PositionCalculationOptions = {}
): Record<string, number> {
  const {
    minGap = 10,
    hoveredCommentId = null,
    baseHeight = 60,
    charsPerLine = 45,
    lineHeight = 20,
  } = options;

  const containerRect = container.getBoundingClientRect();
  const newPositions: Record<string, number> = {};

  // Calculate initial positions based on highlight elements
  comments.forEach((comment, index) => {
    const tag = index.toString();
    const highlightElements = container.querySelectorAll(`[data-tag="${tag}"]`);

    if (highlightElements.length > 0) {
      const highlightElement = highlightElements[0];
      const rect = highlightElement.getBoundingClientRect();
      // Position relative to content container, accounting for scroll
      const relativeTop = rect.top - containerRect.top + container.scrollTop;
      newPositions[tag] = relativeTop;
    } else {
      // Fallback position if highlight not found
      newPositions[tag] = 100 + (index * 150);
    }
  });

  // Sort comments by their position
  const sortedComments = Object.entries(newPositions)
    .sort(([, a], [, b]) => a - b)
    .map(([id, pos]) => ({ id, position: pos }));

  // Adjust positions to prevent overlaps
  const adjusted = new Set<string>();

  // Estimate heights based on text length and hover state
  const getCommentHeight = (commentIndex: number) => {
    const comment = comments[commentIndex];
    if (!comment) return 80;

    const isExpanded = hoveredCommentId === commentIndex.toString();
    const text = comment.description || "";
    const displayLength = (!isExpanded && text.length > 200) ? 200 : text.length;

    const lines = Math.ceil(displayLength / charsPerLine);
    const extraHeight = text.length > 200 ? 25 : 0; // For "..." and hover effect
    
    return baseHeight + (lines * lineHeight) + extraHeight;
  };

  // Adjust overlapping positions
  for (let i = 1; i < sortedComments.length; i++) {
    const prevComment = sortedComments[i - 1];
    const currentComment = sortedComments[i];
    const prevIndex = parseInt(prevComment.id);
    const prevHeight = getCommentHeight(prevIndex);
    const minPosition = prevComment.position + prevHeight + minGap;

    if (currentComment.position < minPosition) {
      currentComment.position = minPosition;
      newPositions[currentComment.id] = minPosition;
      adjusted.add(currentComment.id);
    }
  }

  return newPositions;
}

/**
 * Check if highlights are ready in the container
 */
export function checkHighlightsReady(
  container: HTMLElement,
  expectedCount: number
): boolean {
  const highlightElements = container.querySelectorAll('[data-tag]');
  return highlightElements.length >= expectedCount;
}

/**
 * Get comment display text based on hover state
 */
export function getCommentDisplayText(
  text: string,
  isHovered: boolean,
  maxLength: number = 200
): { text: string; isTruncated: boolean } {
  if (!text) return { text: "", isTruncated: false };
  
  const needsTruncation = text.length > maxLength;
  
  if (!needsTruncation || isHovered) {
    return { text, isTruncated: false };
  }
  
  return { 
    text: text.substring(0, maxLength) + "...",
    isTruncated: true
  };
}