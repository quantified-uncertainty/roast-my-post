import type { Evaluation, Highlight, Comment } from "@/types/databaseTypes";

/**
 * Checks if two highlights overlap
 */
export function highlightsOverlap(a: Highlight, b: Highlight): boolean {
  return (
    (a.startOffset >= b.startOffset && a.startOffset < b.endOffset) ||
    (b.startOffset >= a.startOffset && b.startOffset < a.endOffset)
  );
}

/**
 * Creates a highlight span element
 */
export function createHighlightSpan(
  text: string,
  tag: string,
  color: string,
  isFirstSpan: boolean = false
): HTMLSpanElement {
  const span = document.createElement("span");
  span.textContent = text;
  span.style.backgroundColor = color;
  span.style.cursor = "pointer";
  span.style.borderRadius = "2px";
  span.style.padding = "1px 2px";
  span.dataset["tag"] = tag;

  if (isFirstSpan) {
    span.style.marginLeft = "2px";
  }

  return span;
}

/**
 * Find text nodes in a container
 */
function findTextNodes(
  container: HTMLElement,
  searchText: string
): Array<{ node: Text; nodeOffset: number; globalOffset: number }> {
  const textNodes: Array<{
    node: Text;
    nodeOffset: number;
    globalOffset: number;
  }> = [];
  let globalOffset = 0;

  function traverse(node: Node): void {
    if (node.nodeType === Node.TEXT_NODE) {
      const textNode = node as Text;
      const content = textNode.textContent || "";

      // Check if this text node contains our search text
      const index = content.indexOf(searchText);
      if (index !== -1) {
        textNodes.push({
          node: textNode,
          nodeOffset: index,
          globalOffset: globalOffset + index,
        });
      }

      globalOffset += content.length;
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      // Skip already highlighted content
      const element = node as HTMLElement;
      if (element.dataset["tag"]) {
        const content = element.textContent || "";
        globalOffset += content.length;
        return;
      }

      // Traverse child nodes
      for (let i = 0; i < node.childNodes.length; i++) {
        traverse(node.childNodes[i]);
      }
    }
  }

  traverse(container);
  return textNodes;
}

/**
 * Apply highlight to a specific text node
 */
export function applyHighlightToNode(
  node: Text,
  startOffset: number,
  endOffset: number,
  tag: string,
  color: string
): HTMLSpanElement | null {
  const content = node.textContent || "";

  if (
    startOffset < 0 ||
    endOffset > content.length ||
    startOffset >= endOffset
  ) {
    // Invalid highlight range
    return null;
  }

  // Split the text node
  const beforeText = content.substring(0, startOffset);
  const highlightText = content.substring(startOffset, endOffset);
  const afterText = content.substring(endOffset);

  // Create the highlight span
  const highlightSpan = createHighlightSpan(highlightText, tag, color, true);

  // Replace the original text node with the new structure
  const parent = node.parentNode;
  if (!parent) return null;

  // Insert before text (if any)
  if (beforeText) {
    const beforeNode = document.createTextNode(beforeText);
    parent.insertBefore(beforeNode, node);
  }

  // Insert highlight span
  parent.insertBefore(highlightSpan, node);

  // Insert after text (if any)
  if (afterText) {
    const afterNode = document.createTextNode(afterText);
    parent.insertBefore(afterNode, node);
  }

  // Remove the original text node
  parent.removeChild(node);

  return highlightSpan;
}

/**
 * Apply highlights to a container element
 */
export function applyHighlightsToContainer(
  container: HTMLElement,
  highlights: Comment[],
  colorMap: Record<string, string>,
  forceReset: boolean = false
): void {
  if (forceReset) {
    resetContainer(container);
  }

  // Filter valid highlights and sort by start offset
  const validHighlights = highlights
    .filter((comment) => comment.highlight?.isValid && comment.isValid)
    .sort((a, b) => (a.highlight?.startOffset || 0) - (b.highlight?.startOffset || 0));

  // Apply valid highlights

  for (const comment of validHighlights) {
    const { quotedText } = comment.highlight!;
    const description = comment.description || 'No description';
    const color = colorMap[description] || "#ffeb3b";

    try {
      // Find text nodes that contain our highlight
      const textNodes = findTextNodes(container, quotedText!);

      if (textNodes.length === 0) {
        console.warn(`Could not find text "${quotedText}" in container`);
        continue;
      }

      // Use the first matching text node
      const { node, nodeOffset } = textNodes[0];
      const highlightLength = quotedText!.length;

      applyHighlightToNode(
        node,
        nodeOffset,
        nodeOffset + highlightLength,
        description,
        color
      );

      // Applied highlight successfully
    } catch {
      // Error applying highlight
    }
  }
}

/**
 * Test if text can be found in container
 */
export function testFindTextInContainer(
  container: HTMLElement,
  text: string
): boolean {
  const containerText = container.textContent || "";
  return containerText.includes(text);
}

/**
 * Clean up existing highlights
 */
export function cleanupHighlights(container: HTMLElement): void {
  const highlights = container.querySelectorAll("[data-tag]");
  highlights.forEach((highlight) => {
    const parent = highlight.parentNode;
    if (parent) {
      parent.replaceChild(
        document.createTextNode(highlight.textContent || ""),
        highlight
      );
    }
  });
}

/**
 * Reset container to original state
 */
export function resetContainer(container: HTMLElement, content?: string): void {
  cleanupHighlights(container);
  if (content) {
    container.innerHTML = content;
  }
}

/**
 * Fix overlapping highlights
 */
export function fixOverlappingHighlights(comments: Comment[]): Comment[] {
  // Sort by start offset
  const sorted = [...comments].sort(
    (a, b) => (a.highlight?.startOffset || 0) - (b.highlight?.startOffset || 0)
  );

  const fixed: Comment[] = [];
  for (const comment of sorted) {
    const hasOverlap = fixed.some((existing) =>
      highlightsOverlap(existing.highlight!, comment.highlight!)
    );

    if (!hasOverlap) {
      fixed.push(comment);
    } else {
      console.warn(`Removing overlapping highlight: ${comment.description}`);
    }
  }

  return fixed;
}

/**
 * Validate highlights in a review
 */
export function validateHighlights(review: Evaluation): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  for (const comment of review.comments) {
    if (comment.highlight && !comment.highlight.isValid) {
      errors.push(`Invalid highlight for comment: ${comment.description}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate and fix a document review
 */
export function validateAndFixDocumentReview(review: Evaluation): Evaluation {
  const fixedComments = fixOverlappingHighlights(review.comments as Comment[]);
  return { ...review, comments: fixedComments as any };
}

/**
 * Validate a single highlight
 */
export function validateHighlight(
  content: string,
  highlight: Highlight
): { isValid: boolean; error?: string } {
  const { startOffset, endOffset, quotedText } = highlight;

  if (startOffset < 0 || endOffset <= startOffset) {
    return {
      isValid: false,
      error: `Invalid offsets: start=${startOffset}, end=${endOffset}`,
    };
  }

  if (endOffset > content.length) {
    return {
      isValid: false,
      error: `End offset ${endOffset} exceeds content length ${content.length}`,
    };
  }

  const actualText = content.slice(startOffset, endOffset);
  if (actualText !== quotedText) {
    return {
      isValid: false,
      error: `Text mismatch: expected "${quotedText}", got "${actualText}"`,
    };
  }

  return { isValid: true };
}