/**
 * Validation Constants
 *
 * Shared validation constants used across the application.
 * These constants ensure consistent validation between frontend and backend.
 */

/**
 * Maximum number of words allowed in document content.
 * Set to 100,000 words (~140k tokens) to accommodate longer articles.
 */
export const MAX_DOCUMENT_WORD_COUNT = 100000;

/**
 * Minimum number of characters required in document content.
 */
export const MIN_DOCUMENT_CONTENT_LENGTH = 100;

/**
 * Maximum number of characters allowed in document content.
 * Set to 700,000 characters to accommodate 100,000 words.
 * (Average word length ~6 chars + spaces = ~7 chars per word)
 */
export const MAX_DOCUMENT_CONTENT_LENGTH = 700000;
