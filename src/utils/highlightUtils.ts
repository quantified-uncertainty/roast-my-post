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

interface HighlightWithTag extends Highlight {
  tag: string;
}

export function createHighlightSpan(
  text: string,
  tag: string,
  color: string,
  isFirstSpan: boolean = false
): HTMLSpanElement {
  const span = document.createElement("span");
  span.textContent = text;
  span.className = `bg-${color} rounded cursor-pointer hover:bg-opacity-80`;
  span.dataset.highlightTag = tag;
  if (isFirstSpan) {
    span.id = `highlight-${tag}`;
  }
  return span;
}

/**
 * Stores a copy of the original text content before any highlighting is applied
 */
const originalTextCache = new Map<HTMLElement, string>();

/**
 * Applies a highlight to a text node, handling all cases (start, middle, end)
 */
function applyHighlightToNode(
  node: Text,
  startOffset: number,
  endOffset: number,
  tag: string,
  color: string
): Node[] {
  const text = node.textContent || "";
  const spans: Node[] = [];

  // Create text node for content before highlight
  if (startOffset > 0) {
    spans.push(document.createTextNode(text.substring(0, startOffset)));
  }

  // Create highlight span
  const highlightText = text.substring(startOffset, endOffset);
  const span = createHighlightSpan(highlightText, tag, color, true);
  spans.push(span);

  // Create text node for content after highlight
  if (endOffset < text.length) {
    spans.push(document.createTextNode(text.substring(endOffset)));
  }

  // Replace the original node with the new nodes
  const parent = node.parentNode;
  if (parent) {
    spans.forEach((span) => parent.insertBefore(span, node));
    parent.removeChild(node);
  }

  return spans;
}

/**
 * Finds nodes containing text and returns their positions
 */
function findTextNodes(
  container: HTMLElement,
  searchText: string,
  startOffset: number = 0
): Array<{ node: Text; nodeOffset: number; globalOffset: number }> {
  const matches: Array<{
    node: Text;
    nodeOffset: number;
    globalOffset: number;
  }> = [];
  let globalOffset = 0;

  // Get all text nodes in order
  const allTextNodes: Text[] = [];
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);

  let node: Text | null;
  while ((node = walker.nextNode() as Text)) {
    if (node.textContent?.trim().length) {
      allTextNodes.push(node);
    }
  }

  // Try to match text across adjacent nodes
  for (let i = 0; i < allTextNodes.length; i++) {
    let combinedText = "";
    let currentGlobalOffset = globalOffset;

    // Build up combined text from consecutive nodes
    for (let j = i; j < allTextNodes.length && j < i + 5; j++) {
      if (j > i) {
        combinedText += " ";
        currentGlobalOffset += 1;
      }
      combinedText += allTextNodes[j].textContent || "";

      // Check if we have a match in the combined text
      const index = combinedText.indexOf(searchText);
      if (index !== -1) {
        // Found a match - determine which node contains the start
        let currentPos = 0;
        let nodeGlobalOffset = globalOffset;
        for (let k = i; k <= j; k++) {
          const nodeText = allTextNodes[k].textContent || "";
          if (k > i) {
            currentPos += 1;
            nodeGlobalOffset += 1;
          }

          if (index < currentPos + nodeText.length) {
            // This node contains the start
            matches.push({
              node: allTextNodes[k],
              nodeOffset: index - currentPos,
              globalOffset: nodeGlobalOffset + (index - currentPos),
            });
            break;
          }

          currentPos += nodeText.length;
          nodeGlobalOffset += nodeText.length;
        }
      }
    }
    globalOffset += (allTextNodes[i].textContent || "").length;
  }

  return matches;
}

export function applyHighlightsToContainer(
  container: HTMLElement,
  highlights: Comment[],
  colorMap: Record<string, string>,
  forceReset: boolean = false
): void {
  // Cache original content if not already cached
  if (!originalTextCache.has(container)) {
    originalTextCache.set(container, container.innerHTML);
  }

  // Reset container if requested
  if (forceReset) {
    const originalContent = originalTextCache.get(container);
    if (originalContent) {
      container.innerHTML = originalContent;
    }
  }

  // Process each highlight
  for (let i = 0; i < highlights.length; i++) {
    const highlight = highlights[i];
    const tag = i.toString();
    const color = colorMap[tag] || colorMap[highlight.title] || "yellow-100";
    const matches = findTextNodes(container, highlight.highlight.quotedText);

    if (matches.length > 0) {
      // Find the best match based on proximity to expected offset
      const bestMatch = matches.reduce((best, current) => {
        const currentDiff = Math.abs(
          current.globalOffset - highlight.highlight.startOffset
        );
        const bestDiff = Math.abs(
          best.globalOffset - highlight.highlight.startOffset
        );
        return currentDiff < bestDiff ? current : best;
      });

      // Apply highlight to the best matching node
      applyHighlightToNode(
        bestMatch.node,
        bestMatch.nodeOffset,
        bestMatch.nodeOffset + highlight.highlight.quotedText.length,
        tag,
        color
      );
    }
  }
}

/**
 * Debug function to find text in a container - exported for testing purposes
 */
export function testFindTextInContainer(
  container: HTMLElement,
  text: string
): boolean {
  console.log("Testing text find for:", text.substring(0, 30) + "...");
  const nodes = findTextNodes(container, text);
  console.log(`Found ${nodes.length} matching nodes`);

  if (nodes.length > 0) {
    const firstNode = nodes[0];
    console.log(
      `First node text: "${firstNode.node.textContent?.substring(0, 30)}..."`
    );
    console.log(`Offset: ${firstNode.nodeOffset}`);
    return true;
  }

  return false;
}

function findTextAcrossNodes(
  container: HTMLElement,
  searchText: string
): Array<{ node: Text; nodeOffset: number; globalOffset: number }> {
  const matches: Array<{
    node: Text;
    nodeOffset: number;
    globalOffset: number;
  }> = [];
  let globalOffset = 0;

  // Get all text nodes in order
  const allTextNodes: Text[] = [];
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);

  let node: Text | null;
  while ((node = walker.nextNode() as Text)) {
    if (node.textContent?.trim().length) {
      allTextNodes.push(node);
    }
  }

  // Try to match text across adjacent nodes
  for (let i = 0; i < allTextNodes.length; i++) {
    let combinedText = "";
    let firstMatchingNode: Text | null = null;
    let firstNodeOffset = -1;
    let currentGlobalOffset = globalOffset;

    // Build up combined text from consecutive nodes
    for (let j = i; j < allTextNodes.length && j < i + 5; j++) {
      // Add a space between nodes to handle adjacent text
      if (j > i) {
        combinedText += " ";
        currentGlobalOffset += 1;
      }
      combinedText += allTextNodes[j].textContent || "";

      // If we haven't found a match in the combined text yet, check if we do now
      if (firstMatchingNode === null) {
        const lcCombined = combinedText.toLowerCase();
        const lcSearch = searchText.toLowerCase();

        if (lcCombined.includes(lcSearch)) {
          // We found a match - determine which node it starts in
          firstMatchingNode = allTextNodes[i];
          let startPos = lcCombined.indexOf(lcSearch);

          // Figure out which node contains the start of the match
          let currentPos = 0;
          let nodeGlobalOffset = globalOffset;
          for (let k = i; k <= j; k++) {
            const nodeText = allTextNodes[k].textContent || "";
            if (k > i) {
              currentPos += 1; // Add space between nodes
              nodeGlobalOffset += 1;
            }

            if (startPos < currentPos + nodeText.length) {
              // This node contains the start
              firstMatchingNode = allTextNodes[k];
              firstNodeOffset = startPos - currentPos;
              matches.push({
                node: firstMatchingNode,
                nodeOffset: firstNodeOffset,
                globalOffset: nodeGlobalOffset + firstNodeOffset,
              });
              break;
            }

            currentPos += nodeText.length;
            nodeGlobalOffset += nodeText.length;
          }
        }
      }
    }
    globalOffset += (allTextNodes[i].textContent || "").length;
  }

  return matches;
}

export function applyHighlightToStartNode(
  node: Node,
  highlightStart: number,
  nodeStart: number,
  tag: string,
  color: string
): HTMLSpanElement | null {
  if (!(node instanceof Text)) return null;
  const relativeStart = highlightStart - nodeStart;
  if (
    relativeStart < 0 ||
    !node.textContent ||
    relativeStart >= node.textContent.length
  )
    return null;
  const highlightText = node.textContent.substring(relativeStart);
  if (!highlightText) return null;
  const span = createHighlightSpan(highlightText, tag, color, true);
  node.textContent = node.textContent.substring(0, relativeStart);
  node.parentNode?.insertBefore(span, node.nextSibling);
  return span;
}

export function applyHighlightToEndNode(
  node: Node,
  highlightEnd: number,
  nodeStart: number,
  tag: string,
  color: string
): HTMLSpanElement | null {
  if (!(node instanceof Text)) return null;
  const relativeEnd = highlightEnd - nodeStart;
  if (
    !node.textContent ||
    relativeEnd <= 0 ||
    relativeEnd > node.textContent.length
  )
    return null;
  const highlightText = node.textContent.substring(0, relativeEnd);
  if (!highlightText) return null;
  const span = createHighlightSpan(highlightText, tag, color, false);
  node.textContent = node.textContent.substring(relativeEnd);
  node.parentNode?.insertBefore(span, node);
  return span;
}

export function applyHighlightToMiddleNode(
  node: Node,
  tag: string,
  color: string
): HTMLSpanElement | null {
  if (!(node instanceof Text)) return null;
  if (!node.textContent) return null;
  const span = createHighlightSpan(node.textContent, tag, color, false);
  node.parentNode?.replaceChild(span, node);
  return span;
}

export function cleanupHighlights(container: HTMLElement): void {
  const highlightSpans = container.querySelectorAll("[data-highlight-tag]");
  highlightSpans.forEach((span) => {
    const text = span.textContent;
    if (text) {
      const textNode = document.createTextNode(text);
      span.parentNode?.replaceChild(textNode, span);
    }
  });
}

export function resetContainer(container: HTMLElement, content?: string): void {
  if (content) {
    container.innerHTML = content;
  } else if (originalTextCache.has(container)) {
    container.innerHTML = originalTextCache.get(container)!;
  } else {
    cleanupHighlights(container);
  }
}

export function findNodesContainingText(
  container: HTMLElement,
  searchText: string
): { node: Text; nodeOffset: number }[] {
  const matches: { node: Text; nodeOffset: number }[] = [];
  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_TEXT,
    null
  );

  let currentNode: Text | null;
  let offset = 0;

  while ((currentNode = walker.nextNode() as Text)) {
    const text = currentNode.textContent || "";
    const index = text.indexOf(searchText);
    if (index !== -1) {
      matches.push({
        node: currentNode,
        nodeOffset: offset + index,
      });
    }
    offset += text.length;
  }

  return matches;
}

export function applyHighlightBetweenNodes(
  startNode: Node,
  endNode: Node,
  highlightStart: number,
  highlightEnd: number,
  nodeStart: number,
  tag: string,
  color: string
): Node[] {
  const spans: Node[] = [];

  // Handle start node
  const startSpan = applyHighlightToStartNode(
    startNode,
    highlightStart,
    nodeStart,
    tag,
    color
  );
  if (startSpan) spans.push(startSpan);

  // Handle nodes between start and end
  let currentNode = startNode.nextSibling;
  while (currentNode && currentNode !== endNode) {
    if (currentNode instanceof Text) {
      const middleSpan = applyHighlightToMiddleNode(currentNode, tag, color);
      if (middleSpan) spans.push(middleSpan);
    }
    currentNode = currentNode.nextSibling;
  }

  // Handle end node if different from start node
  if (startNode !== endNode && endNode instanceof Text) {
    const endSpan = applyHighlightToEndNode(
      endNode,
      highlightEnd,
      nodeStart,
      tag,
      color
    );
    if (endSpan) spans.push(endSpan);
  }

  return spans;
}
