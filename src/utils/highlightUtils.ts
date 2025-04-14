// --- src/utils/highlightUtils.ts ---

import type {
  Comment,
  DocumentReview,
  Highlight,
} from '../types/documentReview'; // Import Comment type

// Raw highlight structure expected from LLM response
export interface RawLLMHighlight {
  prefix?: string;
  startText: string;
  quotedText: string;
}

// Calculated highlight structure after verification
export interface CalculatedHighlight {
  startOffset: number;
  endOffset: number;
  prefix?: string; // Can carry over prefix if needed
  quotedText: string; // Store the verified quote
}

export interface TextNodePosition {
  node: Text;
  start: number;
  end: number;
}

/**
 * Checks if two highlights overlap
 * @param a First highlight
 * @param b Second highlight
 * @returns true if highlights overlap, false otherwise
 */
export function highlightsOverlap(a: Highlight, b: Highlight): boolean {
  // Check if one highlight starts within the other or if one completely contains the other
  return (
    (a.startOffset >= b.startOffset && a.startOffset < b.endOffset) ||
    (b.startOffset >= a.startOffset && b.startOffset < a.endOffset)
  );
}

/**
 * Validates that no highlights in the document review overlap
 * @param review The document review to validate
 * @returns Object with validation result and error messages
 */
export function validateHighlights(review: DocumentReview): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const comments = review.comments;

  for (let i = 0; i < comments.length; i++) {
    const comment = comments[i];

    for (let j = i + 1; j < comments.length; j++) {
      const otherComment = comments[j];

      if (highlightsOverlap(comment.highlight, otherComment.highlight)) {
        errors.push(
          `Highlight for comment at index ${i} overlaps with highlight for comment at index ${j}`
        );
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Adjusts highlights to remove overlaps by trimming the second highlight to end where the first one starts
 * @param comments Array of Comment objects
 * @returns A new array with adjusted highlights that don't overlap
 */
export function fixOverlappingHighlights(comments: Comment[]): Comment[] {
  // Create a copy of the comments array to sort and modify
  const commentsCopy = [...comments];
  const fixedComments: Comment[] = [];

  // Sort comments by startOffset to prioritize earlier highlights
  commentsCopy.sort((a, b) => {
    return a.highlight.startOffset - b.highlight.startOffset;
  });

  // Process comments in order, adjusting any that would overlap with already processed ones
  for (const comment of commentsCopy) {
    let adjustedComment = { ...comment };
    let highlight = { ...comment.highlight };
    let needsAdjustment = false;

    // Check against all already processed comments
    for (const processedComment of fixedComments) {
      const processedHighlight = processedComment.highlight;

      // If this highlight overlaps with a processed one, adjust it
      if (
        highlight.startOffset >= processedHighlight.startOffset &&
        highlight.startOffset < processedHighlight.endOffset
      ) {
        // Current highlight starts inside a processed highlight
        // Move its start to after the processed highlight ends
        highlight.startOffset = processedHighlight.endOffset;
        needsAdjustment = true;
      } else if (
        highlight.endOffset > processedHighlight.startOffset &&
        highlight.startOffset < processedHighlight.startOffset
      ) {
        // Current highlight ends inside a processed highlight
        // Trim its end to before the processed highlight starts
        highlight.endOffset = processedHighlight.startOffset;
        needsAdjustment = true;
      } else if (
        highlight.startOffset <= processedHighlight.startOffset &&
        highlight.endOffset >= processedHighlight.endOffset
      ) {
        // Current highlight completely contains a processed highlight
        // Split into two parts or just trim the end depending on relative positions
        // For simplicity, we'll just trim the end here
        highlight.endOffset = processedHighlight.startOffset;
        needsAdjustment = true;
      }
    }

    // If we needed to adjust the highlight, update the quotedText
    if (needsAdjustment && highlight.endOffset > highlight.startOffset) {
      // Note: In a real implementation, you would need access to the full document text
      // to properly update the quotedText. This is just a placeholder.
      highlight.quotedText = `[Adjusted highlight from ${highlight.startOffset} to ${highlight.endOffset}]`;
    }

    // Only add the comment if the highlight is still valid (start < end)
    if (highlight.startOffset < highlight.endOffset) {
      adjustedComment.highlight = highlight;
      fixedComments.push(adjustedComment);
    }
  }

  return fixedComments;
}

/**
 * Validates and corrects a document review to ensure no highlights overlap
 * @param review The document review to validate and correct
 * @returns A corrected document review with non-overlapping highlights
 */
export function validateAndFixDocumentReview(
  review: DocumentReview
): DocumentReview {
  const fixedReview = { ...review };
  fixedReview.comments = fixOverlappingHighlights(review.comments);
  return fixedReview;
}

/**
 * Attempts to find the exact start and end offsets for a highlight based on
 * a starting snippet and the expected full quoted text provided by an LLM.
 *
 * @param content The full original document content.
 * @param rawHighlight The highlight details provided by the LLM.
 * @param searchStartIndex Optional index to start searching from in the content.
 * @returns A CalculatedHighlight object with verified offsets or null if verification fails.
 */
export function calculateHighlightOffsets(
  content: string,
  rawHighlight: RawLLMHighlight,
  searchStartIndex: number = 0 // Default search start index to 0
): CalculatedHighlight | null {
  // Basic validation
  if (!rawHighlight.quotedText || rawHighlight.quotedText.length === 0) {
    console.warn("calculateHighlightOffsets: quotedText is empty.");
    return null;
  }
  if (!rawHighlight.startText || rawHighlight.startText.length === 0) {
    console.warn("calculateHighlightOffsets: startText is empty.");
    return null;
  }

  // Find the potential starting position of the highlight - First attempt from searchStartIndex
  let potentialStartOffset = content.indexOf(
    rawHighlight.startText,
    searchStartIndex
  );

  // If not found starting from searchStartIndex, try searching from the beginning
  if (potentialStartOffset === -1 && searchStartIndex > 0) {
    console.warn(
      `calculateHighlightOffsets: Retrying search for "${rawHighlight.startText.substring(
        0,
        20
      )}..." from index 0.`
    );
    potentialStartOffset = content.indexOf(rawHighlight.startText, 0);
  }

  if (potentialStartOffset === -1) {
    // startText was not found anywhere relevant
    console.warn(
      `calculateHighlightOffsets: startText "${rawHighlight.startText.substring(
        0,
        20
      )}..." not found.` // Simplified message
    );
    return null;
  }

  // Extract the substring from the content based on the potential start and quotedText length
  const potentialEndOffset =
    potentialStartOffset + rawHighlight.quotedText.length;

  // Check if the potential end offset goes beyond the content length
  if (potentialEndOffset > content.length) {
    console.warn(
      `calculateHighlightOffsets: quotedText "${rawHighlight.quotedText.substring(
        0,
        20
      )}..." starting at ${potentialStartOffset} exceeds content length.`
    );
    return null;
  }

  const contentSubstring = content.substring(
    potentialStartOffset,
    potentialEndOffset
  );

  // Verify if the extracted substring exactly matches the expected quotedText
  if (contentSubstring === rawHighlight.quotedText) {
    // Match found! Return the calculated highlight.
    return {
      startOffset: potentialStartOffset,
      endOffset: potentialEndOffset,
      prefix: rawHighlight.prefix,
      quotedText: rawHighlight.quotedText, // Return the verified quote
    };
  } else {
    // No exact match found at this potential start offset.
    // TODO: Consider adding logic here to search for the *next* occurrence of startText
    // if the first one didn't match, before returning null.
    console.warn(
      `calculateHighlightOffsets: Verification failed. Expected "${rawHighlight.quotedText.substring(
        0,
        30
      )}..." but found "${contentSubstring.substring(
        0,
        30
      )}..." at index ${potentialStartOffset}.`
    );
    return null;
  }
}

/**
 * Processes raw comments from the LLM, calculates highlight offsets, and verifies them.
 * Also ensures no overlapping highlights are produced.
 *
 * @param content The full original document content.
 * @param rawComments The array of comment objects received from the LLM, containing RawLLMHighlight.
 * @returns An array of verified Comment objects with calculated offsets.
 */
export function processRawComments(
  content: string,
  rawComments?: Array<
    Omit<Comment, "highlight"> & { highlight: RawLLMHighlight }
  >
): Comment[] {
  const finalComments: Comment[] = [];
  let previousEndOffset = 0; // Track previous offset to help disambiguate startText

  if (!rawComments || !Array.isArray(rawComments)) {
    console.warn(
      "processRawComments: Received undefined, null, or non-array rawComments."
    );
    return finalComments; // Return empty array if no comments
  }

  for (let i = 0; i < rawComments.length; i++) {
    const rawComment = rawComments[i];
    const commentIdentifier = `at index ${i}`; // For logging purposes

    // Basic validation of the raw comment structure
    if (!rawComment.title || !rawComment.description || !rawComment.highlight) {
      console.warn(
        `Skipping comment ${commentIdentifier}: Missing title, description, or highlight data.`
      );
      continue;
    }
    // Ensure highlight has the expected raw structure
    if (!rawComment.highlight.startText || !rawComment.highlight.quotedText) {
      console.warn(
        `Skipping comment ${commentIdentifier}: Raw highlight missing startText or quotedText.`
      );
      continue;
    }

    const calculatedHighlight = calculateHighlightOffsets(
      content,
      rawComment.highlight, // Pass the RawLLMHighlight
      previousEndOffset // Start searching from end of last valid highlight
    );

    if (calculatedHighlight) {
      // Check for overlaps with existing comments before adding
      let overlapsWithExisting = false;

      for (const existingComment of finalComments) {
        if (highlightsOverlap(existingComment.highlight, calculatedHighlight)) {
          console.warn(
            `Skipping comment ${commentIdentifier} ("${rawComment.title}"): Highlight overlaps with an existing comment.`
          );
          overlapsWithExisting = true;
          break;
        }
      }

      if (!overlapsWithExisting) {
        // Construct the final Comment object with calculated offsets
        finalComments.push({
          title: rawComment.title,
          description: rawComment.description,
          // Pass the entire calculatedHighlight object, which matches the Highlight type
          highlight: calculatedHighlight,
        });
        // Update where to start search for the next comment
        previousEndOffset = calculatedHighlight.endOffset;
      }
    } else {
      // Handle cases where the highlight couldn't be verified
      console.warn(
        `Skipping comment ${commentIdentifier} ("${rawComment.title}"): Could not verify highlight offsets.`
      );
    }
  }

  return finalComments;
}

/**
 * Calculates the positions of all text nodes in a container element.
 * This is a pure function that takes a container element and returns an array
 * of text node positions with their start and end offsets in the document.
 */
export function calculateTextNodePositions(
  container: HTMLElement
): TextNodePosition[] {
  // Use NodeFilter.SHOW_TEXT to only get text nodes
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
    // Skip empty text nodes or nodes with only whitespace
    acceptNode: (node) => {
      const text = node.textContent || "";
      return text.trim().length > 0
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_REJECT;
    },
  });

  const textNodes: Text[] = [];
  let node: Text | null;

  // Collect all text nodes
  while ((node = walker.nextNode() as Text)) {
    textNodes.push(node);
  }

  // Calculate positions
  let offset = 0;
  return textNodes.map((node) => {
    const start = offset;
    const length = node.nodeValue?.length || 0;
    offset += length;
    return { node, start, end: start + length };
  });
}

/**
 * Creates a highlight span element with the appropriate styling and attributes
 */
export function createHighlightSpan(
  tag: string,
  color: string,
  isFirstSpan: boolean = false
): HTMLSpanElement {
  const span = document.createElement("span");
  span.className = `bg-${color} rounded cursor-pointer hover:bg-opacity-80`;
  span.dataset.highlightTag = tag;
  span.dataset.tag = tag;

  // Add ID for the first span to enable scrolling
  if (isFirstSpan) {
    span.id = `highlight-${tag}`;
  }

  return span;
}

/**
 * Applies a highlight to a start node, where the highlight begins somewhere in the middle of the node
 */
export function applyHighlightToStartNode(
  node: Text,
  startOffset: number,
  nodeStart: number,
  nodeEnd: number,
  tag: string,
  color: string
): HTMLSpanElement | null {
  const range = document.createRange();
  const localStartOffset = startOffset - nodeStart;
  range.setStart(node, localStartOffset);
  range.setEnd(node, nodeEnd - nodeStart);

  if (range.collapsed || range.toString().length === 0) {
    return null;
  }

  const textContent = node.textContent || "";
  const beforeText = textContent.substring(0, localStartOffset);
  const highlightText = textContent.substring(localStartOffset);

  // Replace the text node with before + highlighted content
  const beforeTextNode = document.createTextNode(beforeText);
  node.parentNode?.insertBefore(beforeTextNode, node);

  // Create and insert the highlight span
  const span = createHighlightSpan(tag, color, true);
  span.textContent = highlightText;
  node.parentNode?.insertBefore(span, node);

  // Remove the original node
  node.parentNode?.removeChild(node);

  return span;
}

/**
 * Applies a highlight to an end node, where the highlight ends somewhere in the middle of the node
 */
export function applyHighlightToEndNode(
  node: Text,
  endOffset: number,
  nodeStart: number,
  tag: string,
  color: string
): HTMLSpanElement | null {
  const range = document.createRange();
  const localEndOffset = endOffset - nodeStart;
  range.setStart(node, 0);
  range.setEnd(node, localEndOffset);

  if (range.collapsed || range.toString().length === 0) {
    return null;
  }

  const textContent = node.textContent || "";
  const highlightText = textContent.substring(0, localEndOffset);
  const afterText = textContent.substring(localEndOffset);

  // Create and insert the highlight span
  const span = createHighlightSpan(tag, color);
  span.textContent = highlightText;
  node.parentNode?.insertBefore(span, node);

  // Insert the after text
  const afterTextNode = document.createTextNode(afterText);
  node.parentNode?.insertBefore(afterTextNode, node);

  // Remove the original node
  node.parentNode?.removeChild(node);

  return span;
}

/**
 * Applies a highlight to a middle node, where the entire node is within the highlight range
 */
export function applyHighlightToMiddleNode(
  node: Text,
  tag: string,
  color: string
): HTMLSpanElement | null {
  if (!node.textContent) {
    return null;
  }

  const span = createHighlightSpan(tag, color);
  span.textContent = node.textContent;
  node.parentNode?.insertBefore(span, node);
  node.parentNode?.removeChild(node);

  return span;
}

/**
 * Removes all highlight spans from a container, restoring the original text content
 * @param container The HTML element containing highlights
 * @returns void
 */
export function cleanupHighlights(container: HTMLElement): void {
  const highlights = container.querySelectorAll("[data-highlight-tag]");

  highlights.forEach((span) => {
    const parent = span.parentNode;
    if (!parent) return;

    // Move all children of the span before the span itself
    while (span.firstChild) {
      parent.insertBefore(span.firstChild, span);
    }

    // Remove the empty span
    parent.removeChild(span);
  });
}

/**
 * Finds and applies highlights to all text nodes between a start and end node
 */
export function applyHighlightBetweenNodes(
  container: HTMLElement,
  positions: TextNodePosition[],
  startNode: TextNodePosition,
  endNode: TextNodePosition,
  startOffset: number,
  endOffset: number,
  tag: string,
  color: string
): HTMLSpanElement[] {
  const highlightedNodes: HTMLSpanElement[] = [];

  // Safety check for invalid nodes
  if (!startNode.node.parentNode || !endNode.node.parentNode) {
    return highlightedNodes;
  }

  // If start and end nodes are the same, we can use a simpler approach
  if (startNode.node === endNode.node) {
    try {
      // Extract the text to highlight
      const text = startNode.node.textContent || "";
      const localStartOffset = Math.max(0, startOffset - startNode.start);
      const localEndOffset = Math.min(text.length, endOffset - startNode.start);

      // Skip if selection is invalid
      if (
        localStartOffset >= localEndOffset ||
        localStartOffset >= text.length
      ) {
        return highlightedNodes;
      }

      const beforeText = text.substring(0, localStartOffset);
      const highlightText = text.substring(localStartOffset, localEndOffset);
      const afterText = text.substring(localEndOffset);

      // Create text nodes and highlight span
      const beforeNode = document.createTextNode(beforeText);
      const span = createHighlightSpan(tag, color, true);
      span.textContent = highlightText;
      const afterNode = document.createTextNode(afterText);

      // Replace the original node with these three nodes
      const parent = startNode.node.parentNode;
      if (parent) {
        parent.insertBefore(beforeNode, startNode.node);
        parent.insertBefore(span, startNode.node);
        parent.insertBefore(afterNode, startNode.node);
        parent.removeChild(startNode.node);
        highlightedNodes.push(span);
      }

      return highlightedNodes;
    } catch (err) {
      return highlightedNodes;
    }
  }

  // For multi-node highlights, create a fresh tree walker each time
  try {
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
    let insideHighlight = false;
    let currentNode: Node | null;

    // Iterate through text nodes
    while ((currentNode = walker.nextNode())) {
      // Check if we've reached the start node
      if (currentNode === startNode.node) {
        insideHighlight = true;
      }

      // Process node if we're inside the highlight range
      if (insideHighlight) {
        const nodePosition = positions.find((p) => p.node === currentNode);
        if (!nodePosition) continue;

        let span: HTMLSpanElement | null = null;

        // This is the start node
        if (currentNode === startNode.node) {
          span = applyHighlightToStartNode(
            currentNode as Text,
            startOffset,
            nodePosition.start,
            nodePosition.end,
            tag,
            color
          );
        }
        // This is the end node
        else if (currentNode === endNode.node) {
          span = applyHighlightToEndNode(
            currentNode as Text,
            endOffset,
            nodePosition.start,
            tag,
            color
          );

          // We've processed the end node, exit the loop
          if (span) {
            insideHighlight = false;
            highlightedNodes.push(span);
          }
          break;
        }
        // This is a node completely inside the highlight range
        else {
          span = applyHighlightToMiddleNode(currentNode as Text, tag, color);
        }

        if (span) {
          highlightedNodes.push(span);
        }
      }

      // Exit if we've reached the end node (in case we couldn't apply the highlight)
      if (currentNode === endNode.node) {
        break;
      }
    }
  } catch (err) {
    // Silently fail but return any successfully highlighted nodes
  }

  return highlightedNodes;
}

/**
 * Stores a copy of the original text content before any highlighting is applied
 */
const originalTextCache = new Map<HTMLElement, string>();

/**
 * Completely resets a container to a clean state by removing all highlights
 * @param container The container element to reset
 * @param content Optional content to restore
 */
export function resetContainer(container: HTMLElement, content?: string): void {
  if (content) {
    container.innerHTML = content;
  } else {
    const cachedContent = originalTextCache.get(container);
    if (cachedContent) {
      container.innerHTML = cachedContent;
    } else {
      cleanupHighlights(container);
    }
  }
}

/**
 * Applies all highlights to a container element
 */
export function applyHighlightsToContainer(
  container: HTMLElement,
  highlights: Comment[],
  highlightColors: Record<string, string>,
  forceReset: boolean = false
): void {
  // Store original content if not already cached
  if (!originalTextCache.has(container)) {
    originalTextCache.set(container, container.innerHTML);
  }

  // Clean up any existing highlights
  cleanupHighlights(container);

  // If no highlights to apply, we're done
  if (!highlights || highlights.length === 0) {
    return;
  }

  try {
    // Calculate positions of all text nodes in the container
    let positions = calculateTextNodePositions(container);

    // Skip if no text nodes found
    if (positions.length === 0) {
      return;
    }

    // Sort highlights by their start offset to apply in document order
    const sortedHighlights = [...highlights].sort(
      (a, b) => a.highlight.startOffset - b.highlight.startOffset
    );

    // Apply each highlight one at a time
    for (let i = 0; i < sortedHighlights.length; i++) {
      try {
        const highlight = sortedHighlights[i];
        const tag = i.toString(); // Use array index as tag
        const color = highlightColors[tag] || "yellow-100";
        const { startOffset, endOffset } = highlight.highlight;

        // Skip invalid highlights
        if (startOffset >= endOffset) {
          continue;
        }

        // Find the exact text nodes for this highlight
        const startNode = positions.find(
          (p) => p.start <= startOffset && p.end > startOffset
        );
        const endNode = positions.find(
          (p) => p.start < endOffset && p.end >= endOffset
        );

        // Skip if we can't find the nodes
        if (!startNode || !endNode) {
          continue;
        }

        // Apply the highlight
        applyHighlightBetweenNodes(
          container,
          positions,
          startNode,
          endNode,
          startOffset,
          endOffset,
          tag,
          color
        );

        // Recalculate positions after each highlight
        positions = calculateTextNodePositions(container);

        // Break if no text nodes left
        if (positions.length === 0) {
          break;
        }
      } catch (err) {
        // Continue with next highlight
      }
    }
  } catch (err) {
    // Silently fail
  }
}
