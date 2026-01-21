/**
 * Common Types for AI Package
 *
 * Shared type definitions used across multiple tools and modules.
 * Import from here to avoid duplication.
 */

// ============================================================================
// Reasoning Configuration Types
// ============================================================================

/**
 * Reasoning effort levels supported by OpenRouter and mapped to Claude thinking budgets.
 * - "none": Disable reasoning entirely (OpenRouter only)
 * - "minimal": ~1024 tokens for reasoning
 * - "low": ~2048 tokens for reasoning
 * - "medium": ~8192 tokens for reasoning
 * - "high": ~16384 tokens for reasoning
 * - "xhigh": ~32768 tokens for reasoning
 */
export type ReasoningEffort = 'none' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh';

/**
 * Reasoning configuration for extended thinking
 * - false: Disabled
 * - { effort: ReasoningEffort }: Use effort level (mapped to budget_tokens)
 * - { budget_tokens: number }: Custom token budget (min 1024)
 */
export type ReasoningConfig =
  | false
  | { effort: ReasoningEffort }
  | { budget_tokens: number };

/**
 * Maps effort levels to Anthropic budget_tokens values
 */
export const EFFORT_TO_BUDGET_TOKENS: Record<Exclude<ReasoningEffort, 'none'>, number> = {
  minimal: 1024,
  low: 2048,
  medium: 8192,
  high: 16384,
  xhigh: 32768,
};

/**
 * Convert reasoning effort level to budget tokens
 */
export function effortToBudgetTokens(effort: ReasoningEffort | string): number {
  if (effort === 'none') return 0;
  return EFFORT_TO_BUDGET_TOKENS[effort as Exclude<ReasoningEffort, 'none'>] || 8192; // Default to medium
}

// ============================================================================
// Deduplication Constants
// ============================================================================

/**
 * Jaccard similarity threshold for deduplication.
 * Issues with word overlap >= this threshold are considered duplicates.
 * Used by both Jaccard dedup and multi-extractor merge.
 */
export const JACCARD_SIMILARITY_THRESHOLD = 0.7;

// ============================================================================
// Provider Configuration Types
// ============================================================================

/**
 * Provider routing preferences for OpenRouter
 */
export interface ProviderPreferences {
  /** Ordered list of preferred providers (e.g., ["anthropic", "google"]) */
  order?: string[];
  /** Allow fallback to other providers if preferred ones fail (default: true) */
  allow_fallbacks?: boolean;
}

// ============================================================================
// API Telemetry Types
// ============================================================================

/**
 * Actual API request parameters as sent to the provider.
 * This is captured right before the API call for debugging/audit.
 */
export interface ActualApiParams {
  /** Model ID sent to API */
  model: string;

  /** Temperature sent to API */
  temperature: number;

  /** Max tokens sent to API */
  maxTokens: number;

  /**
   * Claude thinking config (if applicable)
   * Exactly as sent: { type: "enabled", budget_tokens: number }
   */
  thinking?: {
    type: 'enabled';
    budget_tokens: number;
  };

  /**
   * OpenRouter reasoning config (if applicable)
   * Exactly as sent: { effort: string } or { max_tokens: number }
   */
  reasoning?: {
    effort?: ReasoningEffort;
    max_tokens?: number;
  };
}

/**
 * Response metrics from the API call
 */
export interface ApiResponseMetrics {
  /** Whether the call succeeded */
  success: boolean;

  /** Latency in milliseconds */
  latencyMs: number;

  /** Input tokens used */
  inputTokens?: number;

  /** Output tokens used */
  outputTokens?: number;

  /** Thinking/reasoning tokens used (if extended thinking was enabled) */
  thinkingTokens?: number;

  /** Cache read tokens (if prompt caching was used) */
  cacheReadTokens?: number;

  /** Cache write tokens (if prompt caching was used) */
  cacheWriteTokens?: number;

  /** Stop reason from API */
  stopReason?: string;

  /** Error type if failed */
  errorType?: string;

  /** Error message if failed (sanitized) */
  errorMessage?: string;
}
