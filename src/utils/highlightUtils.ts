// --- src/utils/highlightUtils.ts ---

import type { Comment } from '../types/documentReview'; // Import Comment type

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
      // Construct the final Comment object with calculated offsets
      finalComments[key] = {
        title: rawComment.title,
        description: rawComment.description,
        // Assuming DocumentReview expects Highlight with startOffset/endOffset
        highlight: {
          startOffset: calculatedHighlight.startOffset,
          endOffset: calculatedHighlight.endOffset,
          prefix: calculatedHighlight.prefix,
          // Optionally include quotedText if your final type supports it
          // quotedText: calculatedHighlight.quotedText,
        },
      };
      // Update where to start search for the next comment
      previousEndOffset = calculatedHighlight.endOffset;
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
