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

/**
 * Maximum URL length for images to be considered "large" and automatically stripped.
 * Images with URLs longer than this threshold (or base64 data URIs) will be removed
 * when content exceeds character limits.
 */
export const MAX_IMAGE_URL_LENGTH = 2000;
