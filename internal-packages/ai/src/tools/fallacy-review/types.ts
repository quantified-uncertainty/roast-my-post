/**
 * Types for the epistemic review tool
 */

/**
 * Simplified comment representation for review
 */
export interface ReviewComment {
  /** Comment index in the original array */
  index: number;

  /** Comment header/title */
  header: string;

  /** Full description */
  description: string;

  /** Severity level */
  level: 'error' | 'warning' | 'nitpick' | 'info' | 'success' | 'debug';

  /** Importance score */
  importance?: number;

  /** Quoted text from document */
  quotedText: string;
}

/**
 * Input for the epistemic review tool
 */
export interface FallacyReviewInput {
  /** Full document text */
  documentText: string;

  /** Array of comments to review */
  comments: ReviewComment[];
}

/**
 * Output from the epistemic review tool
 */
export interface FallacyReviewOutput {
  /** Indices of comments to keep (e.g., [0, 2, 5, 7]) */
  commentIndicesToKeep: number[];

  /** Comprehensive 200-600 word summary of document's epistemic quality */
  documentSummary: string;

  /** One-sentence summary for evaluation header */
  oneLineSummary: string;
}
