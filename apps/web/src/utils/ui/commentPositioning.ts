// @ts-expect-error - No types available for markdown-truncate
import truncateMarkdown from "markdown-truncate";
import { COMMENT_POSITIONING, TEXT_PROCESSING, LAYOUT, LIMITS } from '@/components/DocumentWithEvaluations/constants';

import type { Comment } from "@/types/databaseTypes";

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
    minGap = LAYOUT.COMMENT_MIN_GAP,
    hoveredCommentId = null,
    baseHeight = COMMENT_POSITIONING.BASE_HEIGHT,
    charsPerLine = COMMENT_POSITIONING.CHARS_PER_LINE,
    lineHeight = COMMENT_POSITIONING.LINE_HEIGHT,
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
      // Adjust to align with the vertical center of the highlight
      const relativeTop = rect.top - containerRect.top + container.scrollTop;
      const highlightCenter = relativeTop + rect.height / 2;
      // Offset to better align comment with highlighted text
      const adjustedPosition = highlightCenter - COMMENT_POSITIONING.HIGHLIGHT_ALIGNMENT_OFFSET;
      newPositions[tag] = Math.max(0, adjustedPosition);
    } else {
      // Fallback position if highlight not found
      // Try to position based on the highlight offset as a percentage of document
      const comment = comments[index];

      if (comment?.highlight?.startOffset !== undefined) {
        // Get total content length from the container's text content
        const totalTextLength = container.textContent?.length || 10000;

        // Calculate position as a percentage of the document
        const offsetPercentage = Math.min(
          comment.highlight.startOffset / totalTextLength,
          1
        );

        // Get the actual scrollable height of the content
        const scrollHeight = container.scrollHeight || containerRect.height;

        // Position based on percentage of scrollable content
        const estimatedPosition = offsetPercentage * scrollHeight;

        // Ensure the position is within reasonable bounds
        newPositions[tag] = Math.max(
          0,
          Math.min(estimatedPosition, scrollHeight - 100)
        );

        console.debug(`Fallback positioning for comment ${tag}:`, {
          startOffset: comment.highlight.startOffset,
          totalTextLength,
          offsetPercentage,
          estimatedPosition,
        });
      } else {
        // Last resort: spread them out more evenly
        const spacing = Math.max(
          COMMENT_POSITIONING.FALLBACK_SPACING_MIN,
          containerRect.height / Math.max(comments.length, 5)
        );
        newPositions[tag] = COMMENT_POSITIONING.FALLBACK_COMMENT_BOTTOM_MARGIN + index * spacing;
      }
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
    if (!comment) return baseHeight;

    const isExpanded = hoveredCommentId === commentIndex.toString();
    const text = comment.description || "";

    // For short comments, use a more compact calculation
    if (text.length < COMMENT_POSITIONING.COMPACT_COMMENT_THRESHOLD) {
      return baseHeight + COMMENT_POSITIONING.AGENT_NAME_HEIGHT;
    }

    const displayLength = !isExpanded && text.length > 120 ? 120 : text.length;
    const lines = Math.ceil(displayLength / charsPerLine);
    const extraHeight = isExpanded ? COMMENT_POSITIONING.EXPANDED_EXTRA_HEIGHT : 0;

    return (
      baseHeight + (lines - 1) * lineHeight + extraHeight + COMMENT_POSITIONING.AGENT_NAME_HEIGHT
    );
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
  if (expectedCount === 0) return true;

  const highlightElements = container.querySelectorAll("[data-tag]");
  if (highlightElements.length === 0) return false;

  // Get unique tag numbers from the highlights
  const uniqueTags = new Set<string>();
  highlightElements.forEach((el) => {
    const tag = el.getAttribute("data-tag");
    if (tag !== null) {
      uniqueTags.add(tag);
    }
  });

  // Check if we have enough unique tags for the comments
  // Note: Multiple comments can share the same highlight position,
  // so we check if unique tags >= half of expected count as a heuristic
  return uniqueTags.size >= Math.ceil(expectedCount * LIMITS.MIN_UNIQUE_TAGS_RATIO);
}

/**
 * Get comment display text based on hover state
 */
export function getCommentDisplayText(
  text: string,
  isHovered: boolean,
  maxLength: number = TEXT_PROCESSING.MAX_COMMENT_PREVIEW_LENGTH
): { text: string; isTruncated: boolean } {
  if (!text) return { text: "", isTruncated: false };

  // When hovered, show full text
  if (isHovered) {
    return { text, isTruncated: false };
  }

  // First, handle line limits
  const lines = text.split("\n");
  const needsLineTruncation = lines.length > TEXT_PROCESSING.MAX_PREVIEW_LINES;

  // If we only need line truncation and the first N lines are short enough
  if (needsLineTruncation && lines.slice(0, TEXT_PROCESSING.MAX_PREVIEW_LINES).join("\n").length <= maxLength) {
    return {
      text: lines.slice(0, TEXT_PROCESSING.MAX_PREVIEW_LINES).join("\n") + "...",
      isTruncated: true,
    };
  }

  // Use markdown-truncate for smart truncation that preserves markdown/HTML structure
  // It's designed to handle markdown properly and not break tags
  try {
    const truncated = truncateMarkdown(text, {
      limit: maxLength,
      ellipsis: true,
    });

    // Check if we still need to enforce line limit after smart truncation
    const truncatedLines = truncated.split("\n");
    if (truncatedLines.length > TEXT_PROCESSING.MAX_PREVIEW_LINES) {
      // Try a shorter limit to fit within line limit
      const shorterTruncated = truncateMarkdown(text, {
        limit: Math.floor(maxLength * TEXT_PROCESSING.TRUNCATION_SHORT_RATIO),
        ellipsis: true,
      });

      const shorterLines = shorterTruncated.split("\n");
      if (shorterLines.length <= TEXT_PROCESSING.MAX_PREVIEW_LINES) {
        return {
          text: shorterTruncated,
          isTruncated: true,
        };
      }

      // Last resort: just take first N lines of the truncated text
      return {
        text: truncatedLines.slice(0, TEXT_PROCESSING.MAX_PREVIEW_LINES).join("\n") + "...",
        isTruncated: true,
      };
    }

    return {
      text: truncated,
      isTruncated: text !== truncated,
    };
  } catch (error) {
    // Fallback if markdown-truncate fails
    console.error("Markdown truncation failed:", error);
    const fallbackText = lines.slice(0, TEXT_PROCESSING.MAX_PREVIEW_LINES).join("\n");
    return {
      text:
        fallbackText.length > maxLength
          ? fallbackText.substring(0, maxLength) + "..."
          : fallbackText + (needsLineTruncation ? "..." : ""),
      isTruncated: true,
    };
  }
}
