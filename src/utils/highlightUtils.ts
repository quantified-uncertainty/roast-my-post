// Line-based highlighting system with UI support
// Combines reliable line-based highlighting with DOM manipulation functions

import type { Comment, Evaluation, Highlight } from "../types/documentSchema";

// Line-based highlight interfaces
export interface LineCharacterHighlight {
  startLineIndex: number; // Which line to start (0-based)
  startCharacters: string; // First ~6 chars of highlight
  endLineIndex: number; // Which line to end (0-based)
  endCharacters: string; // Last ~6 chars of highlight
}

export interface LineCharacterComment {
  title: string;
  description: string;
  importance: number;
  grade?: number;
  highlight: LineCharacterHighlight;
}

/**
 * Line-based highlighting using character snippets for precise positioning
 * Optimized for LessWrong-style markdown posts
 */
export class LineBasedHighlighter {
  private originalContent: string;
  private lines: string[] = [];
  private lineStartOffsets: number[] = [];

  constructor(content: string) {
    this.originalContent = content;
    this.parseLines();
  }

  private parseLines() {
    this.lines = this.originalContent.split("\n");

    // Calculate start offset for each line in the original document
    let offset = 0;
    for (let i = 0; i < this.lines.length; i++) {
      this.lineStartOffsets[i] = offset;
      offset += this.lines[i].length + 1; // +1 for the \n character
    }
  }

  /**
   * Get the numbered lines content for the LLM prompt
   */
  getNumberedLines(): string {
    return this.lines.map((line, index) => `Line ${index}: ${line}`).join("\n");
  }

  /**
   * Get document statistics for the LLM prompt
   */
  getStats() {
    return {
      totalLines: this.lines.length,
      totalCharacters: this.originalContent.length,
      averageLineLength: Math.round(
        this.originalContent.length / this.lines.length
      ),
      longestLine: Math.max(...this.lines.map((line) => line.length)),
    };
  }

  /**
   * Convert offset-based highlight to line-based format
   */
  convertOffsetToLineBased(highlight: {
    startOffset: number;
    endOffset: number;
    quotedText: string;
  }): LineCharacterHighlight {
    // Find the line containing startOffset
    let startLineIndex = 0;
    while (
      startLineIndex < this.lineStartOffsets.length - 1 &&
      this.lineStartOffsets[startLineIndex + 1] <= highlight.startOffset
    ) {
      startLineIndex++;
    }

    // Find the line containing endOffset
    let endLineIndex = startLineIndex;
    while (
      endLineIndex < this.lineStartOffsets.length - 1 &&
      this.lineStartOffsets[endLineIndex + 1] <= highlight.endOffset
    ) {
      endLineIndex++;
    }

    // Get the text snippets
    const startPosInLine =
      highlight.startOffset - this.lineStartOffsets[startLineIndex];
    const endPosInLine =
      highlight.endOffset - this.lineStartOffsets[endLineIndex];

    const startCharacters = this.lines[startLineIndex].slice(
      startPosInLine,
      startPosInLine + 6
    );
    const endCharacters = this.lines[endLineIndex].slice(
      endPosInLine - 6,
      endPosInLine
    );

    return {
      startLineIndex,
      startCharacters,
      endLineIndex,
      endCharacters,
    };
  }

  /**
   * Find a character snippet within a specific line using fuzzy matching
   */
  private findSnippetInLine(lineIndex: number, snippet: string): number | null {
    if (lineIndex >= this.lines.length) {
      console.warn(
        `Line index ${lineIndex} exceeds document length ${this.lines.length}`
      );
      return null;
    }

    const line = this.lines[lineIndex];

    // Try exact match first
    const exactIndex = line.indexOf(snippet);
    if (exactIndex !== -1) {
      return exactIndex;
    }

    // Try case-insensitive exact match
    const lowerSnippet = snippet.toLowerCase();
    const lowerLine = line.toLowerCase();
    const caseInsensitiveIndex = lowerLine.indexOf(lowerSnippet);
    if (caseInsensitiveIndex !== -1) {
      console.warn(`Using case-insensitive match for "${snippet}" in line ${lineIndex}`);
      return caseInsensitiveIndex;
    }

    // Try trimmed exact match (remove leading/trailing whitespace)
    const trimmedSnippet = snippet.trim();
    const trimmedIndex = line.indexOf(trimmedSnippet);
    if (trimmedIndex !== -1) {
      console.warn(`Using trimmed match "${trimmedSnippet}" instead of "${snippet}" in line ${lineIndex}`);
      return trimmedIndex;
    }

    // Try fuzzy matching - remove spaces and special chars for comparison
    const normalizeForSearch = (text: string) =>
      text.replace(/\s+/g, "").replace(/[^\w]/g, "").toLowerCase();

    const normalizedSnippet = normalizeForSearch(snippet);
    const normalizedLine = normalizeForSearch(line);

    if (normalizedSnippet.length > 0) {
      const fuzzyIndex = normalizedLine.indexOf(normalizedSnippet);
      if (fuzzyIndex !== -1) {
        // Map back to original line position (approximate)
        const ratio = fuzzyIndex / normalizedLine.length;
        const approximateIndex = Math.floor(ratio * line.length);
        console.warn(`Using fuzzy match for "${snippet}" at approximate position ${approximateIndex} in line ${lineIndex}`);
        return approximateIndex;
      }
    }

    // Try partial matching - find the longest common substring
    for (let len = Math.min(snippet.length, 10); len >= 3; len--) {
      for (let start = 0; start <= snippet.length - len; start++) {
        const partial = snippet.substring(start, start + len);
        const partialIndex = line.indexOf(partial);
        if (partialIndex !== -1) {
          console.warn(
            `Using partial match "${partial}" instead of "${snippet}" in line ${lineIndex}`
          );
          return partialIndex;
        }
      }
    }

    // Try searching in nearby lines as a fallback (LLM might have line numbers slightly off)
    const searchRange = 2;
    for (let offset = 1; offset <= searchRange; offset++) {
      // Check line above
      if (lineIndex - offset >= 0) {
        const nearbyLine = this.lines[lineIndex - offset];
        const nearbyIndex = nearbyLine.indexOf(snippet);
        if (nearbyIndex !== -1) {
          console.warn(
            `Found snippet "${snippet}" in nearby line ${lineIndex - offset} instead of line ${lineIndex}`
          );
          // Don't return this match, just log it for debugging
        }
      }
      
      // Check line below
      if (lineIndex + offset < this.lines.length) {
        const nearbyLine = this.lines[lineIndex + offset];
        const nearbyIndex = nearbyLine.indexOf(snippet);
        if (nearbyIndex !== -1) {
          console.warn(
            `Found snippet "${snippet}" in nearby line ${lineIndex + offset} instead of line ${lineIndex}`
          );
          // Don't return this match, just log it for debugging
        }
      }
    }

    console.warn(
      `Could not find snippet "${snippet}" in line ${lineIndex}: "${line}"`
    );
    return null;
  }

  /**
   * Convert line-based highlight to document character offsets
   */
  createHighlight(
    highlight: LineCharacterHighlight
  ): { startOffset: number; endOffset: number; text: string } | null {
    const { startLineIndex, startCharacters, endLineIndex, endCharacters } =
      highlight;

    // Validate line indices first
    if (startLineIndex < 0 || startLineIndex >= this.lines.length) {
      console.warn(`Invalid startLineIndex ${startLineIndex}, document has ${this.lines.length} lines`);
      return null;
    }
    
    if (endLineIndex < 0 || endLineIndex >= this.lines.length) {
      console.warn(`Invalid endLineIndex ${endLineIndex}, document has ${this.lines.length} lines`);
      return null;
    }

    if (startLineIndex > endLineIndex) {
      console.warn(`startLineIndex ${startLineIndex} is after endLineIndex ${endLineIndex}`);
      return null;
    }

    // Find start position
    const startPosInLine = this.findSnippetInLine(
      startLineIndex,
      startCharacters
    );
    if (startPosInLine === null) {
      console.warn(`Failed to find start snippet "${startCharacters}" in line ${startLineIndex}: "${this.lines[startLineIndex]}"`);
      return null;
    }

    // Find end position
    const endPosInLine = this.findSnippetInLine(endLineIndex, endCharacters);
    if (endPosInLine === null) {
      console.warn(`Failed to find end snippet "${endCharacters}" in line ${endLineIndex}: "${this.lines[endLineIndex]}"`);
      return null;
    }

    // Convert to document offsets
    const startOffset = this.lineStartOffsets[startLineIndex] + startPosInLine;
    let endOffset: number;

    if (startLineIndex === endLineIndex) {
      // Same line - end position should be after start position
      const endPosAdjusted = endPosInLine + endCharacters.length;
      if (endPosAdjusted <= startPosInLine) {
        console.warn(
          `End position ${endPosAdjusted} is before start position ${startPosInLine} on line ${startLineIndex}. Attempting to fix...`
        );
        
        // Try to find a reasonable end position after the start
        const lineText = this.lines[startLineIndex];
        const remainingText = lineText.substring(startPosInLine);
        const minHighlightLength = Math.min(50, remainingText.length);
        endOffset = startOffset + minHighlightLength;
      } else {
        endOffset = this.lineStartOffsets[endLineIndex] + endPosAdjusted;
      }
    } else {
      // Different lines
      endOffset =
        this.lineStartOffsets[endLineIndex] +
        endPosInLine +
        endCharacters.length;
    }

    // Validate offsets
    if (
      startOffset < 0 ||
      endOffset <= startOffset ||
      endOffset > this.originalContent.length
    ) {
      console.warn(
        `Invalid offsets: start=${startOffset}, end=${endOffset}, content length=${this.originalContent.length}`
      );
      
      // Try to create a valid fallback highlight
      if (startOffset >= 0 && startOffset < this.originalContent.length) {
        const maxLength = Math.min(100, this.originalContent.length - startOffset);
        endOffset = startOffset + maxLength;
        console.warn(`Using fallback highlight of ${maxLength} characters`);
      } else {
        return null;
      }
    }

    const text = this.originalContent.slice(startOffset, endOffset);

    return {
      startOffset,
      endOffset,
      text,
    };
  }

  /**
   * Process comments with line-based highlights and convert to standard Comment format
   */
  processLineComments(comments: LineCharacterComment[]): Comment[] {
    const processedComments: Comment[] = [];

    for (const comment of comments) {
      const highlightResult = this.createHighlight(comment.highlight);

      if (highlightResult) {
        const processedComment: Comment = {
          title: comment.title,
          description: comment.description,
          importance: comment.importance || 5,
          grade: comment.grade,
          highlight: {
            startOffset: highlightResult.startOffset,
            endOffset: highlightResult.endOffset,
            quotedText: highlightResult.text,
            isValid: true,
          },
          isValid: true,
        };
        processedComments.push(processedComment);
      } else {
        // Create invalid comment for debugging
        const invalidComment: Comment = {
          title: comment.title,
          description: comment.description,
          importance: comment.importance || 5,
          grade: comment.grade,
          highlight: {
            startOffset: -1,
            endOffset: -1,
            quotedText: "",
            isValid: false,
          },
          isValid: false,
          error: `Could not find highlight: lines ${comment.highlight.startLineIndex}-${comment.highlight.endLineIndex}, snippets "${comment.highlight.startCharacters}" to "${comment.highlight.endCharacters}"`,
        };
        processedComments.push(invalidComment);
      }
    }

    return processedComments;
  }
}

// ============================================================================
// UI FUNCTIONS - For HighlightedMarkdown component
// ============================================================================

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

  function traverse(node: Node) {
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
  const highlightLength = endOffset - startOffset;

  if (
    startOffset < 0 ||
    endOffset > content.length ||
    startOffset >= endOffset
  ) {
    console.warn(
      `Invalid highlight range: ${startOffset}-${endOffset} for text of length ${content.length}`
    );
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
    .filter((comment) => comment.highlight.isValid && comment.isValid)
    .sort((a, b) => a.highlight.startOffset - b.highlight.startOffset);

  console.log(`Applying ${validHighlights.length} valid highlights`);

  for (const comment of validHighlights) {
    const { startOffset, endOffset, quotedText } = comment.highlight;
    const color = colorMap[comment.title] || "#ffeb3b";

    try {
      // Find text nodes that contain our highlight
      const textNodes = findTextNodes(container, quotedText);

      if (textNodes.length === 0) {
        console.warn(`Could not find text "${quotedText}" in container`);
        continue;
      }

      // Use the first matching text node
      const { node, nodeOffset } = textNodes[0];
      const highlightLength = quotedText.length;

      applyHighlightToNode(
        node,
        nodeOffset,
        nodeOffset + highlightLength,
        comment.title,
        color
      );

      console.log(`Applied highlight for "${comment.title}"`);
    } catch (error) {
      console.error(`Error applying highlight for "${comment.title}":`, error);
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
    (a, b) => a.highlight.startOffset - b.highlight.startOffset
  );

  const fixed: Comment[] = [];
  for (const comment of sorted) {
    const hasOverlap = fixed.some((existing) =>
      highlightsOverlap(existing.highlight, comment.highlight)
    );

    if (!hasOverlap) {
      fixed.push(comment);
    } else {
      console.warn(`Removing overlapping highlight: ${comment.title}`);
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
    if (!comment.highlight.isValid) {
      errors.push(`Invalid highlight for comment: ${comment.title}`);
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
  const fixedComments = fixOverlappingHighlights(review.comments);
  return { ...review, comments: fixedComments };
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
