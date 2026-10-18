/**
 * AI Package Constants
 * Centralized constants for AI/LLM configuration
 *
 * NOTE: These defaults are also defined in @roast/domain/core/config.ts
 * If you change these, update both files to stay in sync.
 */

/**
 * Default model for analysis tasks.
 * This is used as the fallback when ANALYSIS_MODEL env var is not set.
 */
export const DEFAULT_ANALYSIS_MODEL = "claude-sonnet-5-5";

/**
 * Default model for search/fast tasks.
 * This is used as the fallback when SEARCH_MODEL env var is not set.
 */
export const DEFAULT_SEARCH_MODEL = "claude-haiku-5-5";
