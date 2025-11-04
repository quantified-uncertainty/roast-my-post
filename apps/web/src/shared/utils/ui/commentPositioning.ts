// @ts-expect-error - No types available for markdown-truncate
import truncateMarkdown from "markdown-truncate";
import {
  COMMENT_POSITIONING,
  TEXT_PROCESSING,
  LAYOUT,
  LIMITS,
} from "@/components/DocumentWithEvaluations/constants";

import type { Comment } from "@/shared/types/databaseTypes";

interface _CommentPosition {
  id: string;
  position: number;
}

interface PositionCalculationOptions {
  minGap?: number;
  hoveredCommentId?: string | null;
  baseHeight?: number;
  charsPerLine?: number;
  lineHeight?: number;
  highlightCache?: Map<string, HTMLElement>;
}

// Memoized height calculation cache
const heightCache = new WeakMap<Comment, { text: string; height: number }>();

/**
 * Calculate the positions of comments based on their highlight elements
 * Optimized version with caching and batch DOM reads
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
    highlightCache,
  } = options;

  const containerRect = container.getBoundingClientRect();
  const newPositions: Record<string, number> = {};

  // Batch DOM reads for better performance
  const highlightRects = new Map<string, DOMRect>();
  const highlightElements = new Map<string, HTMLElement>();

  const getCodeBlockAnchor = (el: HTMLElement, stopAt: HTMLElement): HTMLElement => {
    let node: HTMLElement | null = el;
    while (node && node !== stopAt) {
      const tag = node.tagName?.toLowerCase();
      const style = window.getComputedStyle(node);
      const overflowX = style.overflowX;
      const overflowY = style.overflowY;
      const isScrollable =
        overflowX === "auto" ||
        overflowX === "scroll" ||
        overflowY === "auto" ||
        overflowY === "scroll";
      const isCodeBlock = tag === "pre" || tag === "code";
      if (isCodeBlock || isScrollable) return node;
      node = node.parentElement;
    }
    return el;
  };

  // Use cache if provided, otherwise query DOM
  if (highlightCache) {
    // Use cached elements
    comments.forEach((_, index) => {
      const tag = index.toString();
      const element = highlightCache.get(tag);
      if (element) {
        highlightElements.set(tag, element);
        highlightRects.set(tag, element.getBoundingClientRect());
      }
    });
  } else {
    // Batch query all highlights at once
    const allHighlights = container.querySelectorAll("[data-tags]");
    const highlightsByTag = new Map<string, Element>();

    allHighlights.forEach((el) => {
      const tagsAttr = el.getAttribute("data-tags");
      if (tagsAttr) {
        try {
          const tags = JSON.parse(tagsAttr) as string[];
          tags.forEach((t) => {
            if (!highlightsByTag.has(t)) highlightsByTag.set(t, el);
          });
        } catch (_e) {
          // ignore malformed JSON
        }
      }
    });

    // Batch read all rects
    highlightsByTag.forEach((element, tag) => {
      const el = element as HTMLElement;
      highlightElements.set(tag, el);
      highlightRects.set(tag, el.getBoundingClientRect());
    });
  }

  // Calculate initial positions based on cached rects
  comments.forEach((comment, index) => {
    const tag = index.toString();
    const rect = highlightRects.get(tag);
    const element = highlightElements.get(tag);

    if (rect) {
      // Prefer anchoring to code-block/scrollable wrapper when applicable
      const anchorEl = element ? getCodeBlockAnchor(element, container) : null;
      const anchorRect = anchorEl ? anchorEl.getBoundingClientRect() : rect;

      // Position relative to content container, accounting for scroll
      const relativeTop =
        anchorRect.top - containerRect.top + container.scrollTop;
      // Position at the top of the highlight, not the center
      const adjustedPosition =
        relativeTop - COMMENT_POSITIONING.HIGHLIGHT_ALIGNMENT_OFFSET;
      newPositions[tag] = Math.max(0, adjustedPosition);
    } else {
      // Fallback position if highlight not found
      const fallbackPosition = getFallbackPosition(
        comment,
        index,
        container,
        containerRect
      );
      newPositions[tag] = fallbackPosition;
    }
  });

  // Sort comments by their position
  const sortedComments = Object.entries(newPositions)
    .sort(([, a], [, b]) => a - b)
    .map(([id, pos]) => ({ id, position: pos }));

  // Adjust positions to prevent overlaps
  const adjusted = new Set<string>();

  // Optimized height calculation with caching
  const getCommentHeight = (commentIndex: number) => {
    const comment = comments[commentIndex];
    if (!comment) return baseHeight;

    // Check cache first
    const cached = heightCache.get(comment);
    const text = comment.description || "";

    if (cached && cached.text === text) {
      // Account for hover state
      const isExpanded = hoveredCommentId === commentIndex.toString();
      return isExpanded
        ? cached.height + COMMENT_POSITIONING.EXPANDED_EXTRA_HEIGHT
        : cached.height;
    }

    // Calculate and cache height
    const isExpanded = hoveredCommentId === commentIndex.toString();

    // For short comments, use a more compact calculation
    if (text.length < COMMENT_POSITIONING.COMPACT_COMMENT_THRESHOLD) {
      const height = baseHeight + COMMENT_POSITIONING.AGENT_NAME_HEIGHT;
      heightCache.set(comment, { text, height });
      return height;
    }

    const displayLength = !isExpanded && text.length > 120 ? 120 : text.length;
    const lines = Math.ceil(displayLength / charsPerLine);
    const extraHeight = isExpanded
      ? COMMENT_POSITIONING.EXPANDED_EXTRA_HEIGHT
      : 0;

    const height =
      baseHeight +
      (lines - 1) * lineHeight +
      COMMENT_POSITIONING.AGENT_NAME_HEIGHT;
    heightCache.set(comment, { text, height: height - extraHeight }); // Cache base height without expansion

    return height + extraHeight;
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
 * Get fallback position for comments without highlights
 */
function getFallbackPosition(
  comment: Comment,
  index: number,
  container: HTMLElement,
  containerRect: DOMRect
): number {
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
    return Math.max(0, Math.min(estimatedPosition, scrollHeight - 100));
  } else {
    // Last resort: spread them out more evenly
    const spacing = Math.max(
      COMMENT_POSITIONING.FALLBACK_SPACING_MIN,
      containerRect.height / Math.max(5, 5)
    );
    return COMMENT_POSITIONING.FALLBACK_COMMENT_BOTTOM_MARGIN + index * spacing;
  }
}

/**
 * Check if highlights are ready in the container
 * Optimized to avoid repeated DOM queries
 */
export function checkHighlightsReady(
  container: HTMLElement,
  expectedCount: number
): boolean {
  if (expectedCount === 0) return true;

  // Single query for all highlights
  const highlightElements = container.querySelectorAll("[data-tags]");
  if (highlightElements.length === 0) return false;

  // Get unique tag numbers from the highlights
  const uniqueTags = new Set<string>();
  highlightElements.forEach((el) => {
    const tagsAttr = el.getAttribute("data-tags");
    if (tagsAttr) {
      try {
        const tags = JSON.parse(tagsAttr) as string[];
        tags.forEach((t) => uniqueTags.add(t));
      } catch (_e) {
        // ignore malformed JSON
      }
    }
  });

  // Check if we have enough unique tags for the comments
  return (
    uniqueTags.size >= Math.ceil(expectedCount * LIMITS.MIN_UNIQUE_TAGS_RATIO)
  );
}

// Memoized truncation cache
const truncationCache = new Map<
  string,
  {
    isHovered: boolean;
    maxLength: number;
    result: { text: string; isTruncated: boolean };
  }
>();

/**
 * Get comment display text based on hover state
 * Optimized with caching for expensive markdown truncation
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

  // Check cache
  const cacheKey = `${text.substring(0, 50)}-${text.length}`;
  const cached = truncationCache.get(cacheKey);
  if (
    cached &&
    cached.isHovered === isHovered &&
    cached.maxLength === maxLength
  ) {
    return cached.result;
  }

  // First, handle line limits
  const lines = text.split("\n");
  const needsLineTruncation = lines.length > TEXT_PROCESSING.MAX_PREVIEW_LINES;

  // If we only need line truncation and the first N lines are short enough
  if (
    needsLineTruncation &&
    lines.slice(0, TEXT_PROCESSING.MAX_PREVIEW_LINES).join("\n").length <=
      maxLength
  ) {
    const result = {
      text:
        lines.slice(0, TEXT_PROCESSING.MAX_PREVIEW_LINES).join("\n") + "...",
      isTruncated: true,
    };
    truncationCache.set(cacheKey, { isHovered, maxLength, result });
    return result;
  }

  // Use markdown-truncate for smart truncation that preserves markdown/HTML structure
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
        const result = {
          text: shorterTruncated,
          isTruncated: true,
        };
        truncationCache.set(cacheKey, { isHovered, maxLength, result });
        return result;
      }

      // Last resort: just take first N lines of the truncated text
      const result = {
        text:
          truncatedLines
            .slice(0, TEXT_PROCESSING.MAX_PREVIEW_LINES)
            .join("\n") + "...",
        isTruncated: true,
      };
      truncationCache.set(cacheKey, { isHovered, maxLength, result });
      return result;
    }

    const result = {
      text: truncated,
      isTruncated: text !== truncated,
    };
    truncationCache.set(cacheKey, { isHovered, maxLength, result });
    return result;
  } catch (error) {
    // Fallback if markdown-truncate fails
    console.error("Markdown truncation failed:", error);
    const fallbackText = lines
      .slice(0, TEXT_PROCESSING.MAX_PREVIEW_LINES)
      .join("\n");
    const result = {
      text:
        fallbackText.length > maxLength
          ? fallbackText.substring(0, maxLength) + "..."
          : fallbackText + (needsLineTruncation ? "..." : ""),
      isTruncated: true,
    };
    truncationCache.set(cacheKey, { isHovered, maxLength, result });
    return result;
  }
}

// Export cache management functions for components to use
export function clearTruncationCache() {
  truncationCache.clear();
}

export function getTruncationCacheSize() {
  return truncationCache.size;
}

// Let components manage cache cleanup in their useEffect cleanup
// This prevents memory leaks from global intervals
