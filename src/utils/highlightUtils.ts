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
  const comments = Object.entries(review.comments);

  for (let i = 0; i < comments.length; i++) {
    const [commentId, comment] = comments[i];

    for (let j = i + 1; j < comments.length; j++) {
      const [otherCommentId, otherComment] = comments[j];

      if (highlightsOverlap(comment.highlight, otherComment.highlight)) {
        errors.push(
          `Highlight for comment ${commentId} overlaps with highlight for comment ${otherCommentId}`
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
 * @param highlights Record of comment IDs to Comment objects
 * @returns A new record with adjusted highlights that don't overlap
 */
export function fixOverlappingHighlights(
  comments: Record<string, Comment>
): Record<string, Comment> {
  const commentEntries = Object.entries(comments);
  const fixedComments: Record<string, Comment> = {};

  // Sort comments by startOffset to prioritize earlier highlights
  commentEntries.sort((a, b) => {
    return a[1].highlight.startOffset - b[1].highlight.startOffset;
  });

  // Process comments in order, adjusting any that would overlap with already processed ones
  for (const [commentId, comment] of commentEntries) {
    let adjustedComment = { ...comment };
    let highlight = { ...comment.highlight };
    let needsAdjustment = false;

    // Check against all already processed comments
    for (const processedCommentId in fixedComments) {
      const processedHighlight = fixedComments[processedCommentId].highlight;

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
      fixedComments[commentId] = adjustedComment;
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
 * @param rawComments The comments object received from the LLM, containing RawLLMHighlight.
 * @returns A record of verified Comment objects with calculated offsets.
 */
export function processRawComments(
  content: string,
  rawComments:
    | Record<
        string,
        Omit<Comment, "highlight"> & { highlight: RawLLMHighlight }
      >
    | undefined
): Record<string, Comment> {
  const finalComments: Record<string, Comment> = {};
  let previousEndOffset = 0; // Track previous offset to help disambiguate startText

  if (!rawComments) {
    console.warn("processRawComments: Received undefined or null rawComments.");
    return finalComments; // Return empty object if no comments
  }

  for (const [key, rawComment] of Object.entries(rawComments)) {
    // Basic validation of the raw comment structure
    if (!rawComment.title || !rawComment.description || !rawComment.highlight) {
      console.warn(
        `Skipping comment ${key}: Missing title, description, or highlight data.`
      );
      continue;
    }
    // Ensure highlight has the expected raw structure
    if (!rawComment.highlight.startText || !rawComment.highlight.quotedText) {
      console.warn(
        `Skipping comment ${key}: Raw highlight missing startText or quotedText.`
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

      for (const existingComment of Object.values(finalComments)) {
        if (highlightsOverlap(existingComment.highlight, calculatedHighlight)) {
          console.warn(
            `Skipping comment ${key} ("${rawComment.title}"): Highlight overlaps with an existing comment.`
          );
          overlapsWithExisting = true;
          break;
        }
      }

      if (!overlapsWithExisting) {
        // Construct the final Comment object with calculated offsets
        finalComments[key] = {
          title: rawComment.title,
          description: rawComment.description,
          // Pass the entire calculatedHighlight object, which matches the Highlight type
          highlight: calculatedHighlight,
        };
        // Update where to start search for the next comment
        previousEndOffset = calculatedHighlight.endOffset;
      }
    } else {
      // Handle cases where the highlight couldn't be verified
      console.warn(
        `Skipping comment ${key} ("${rawComment.title}"): Could not verify highlight offsets.`
      );
      // Optional: Implement retry logic with searchStartIndex = 0?
      // We still update previousEndOffset here to avoid infinite loops if
      // the LLM consistently provides bad highlights for adjacent sections.
      // A failed highlight shouldn't prevent subsequent valid ones from being found.
      // Resetting search start for the *next* iteration might be better if needed.
    }
  }

  return finalComments;
}
