/**
 * Principle of Charity Filter Types
 *
 * This filter applies the "principle of charity" - interpreting arguments
 * in their strongest, most reasonable form before critiquing. It filters out
 * issues that don't hold up when the author's argument is charitably interpreted.
 */

import type { UnifiedUsageMetrics } from '../../utils/usageMetrics';
import type {
  ReasoningEffort,
  ReasoningConfig,
  ProviderPreferences,
  ActualApiParams,
  ApiResponseMetrics,
} from '../../types/common';

// Re-export for backwards compatibility
export type { ReasoningEffort, ReasoningConfig, ProviderPreferences, ActualApiParams, ApiResponseMetrics };

export interface PrincipleOfCharityFilterInput {
  /** Full document text for context */
  documentText: string;

  /** Issues to evaluate with principle of charity */
  issues: CharityFilterIssue[];

  /**
   * Optional model to use for filtering.
   * Can be a Claude model (default) or an OpenRouter model ID.
   * Examples: "claude-sonnet-4-20250514", "google/gemini-3-flash-preview"
   */
  model?: string;

  /** Temperature for the LLM (0-2). Default is 0.2 for thoughtful analysis. */
  temperature?: number;

  /** Reasoning/thinking configuration for Claude models */
  reasoning?: ReasoningConfig;

  /** Provider routing preferences (OpenRouter only) */
  provider?: ProviderPreferences;

  /** Custom system prompt (overrides default) */
  customPrompt?: string;
}

export interface CharityFilterIssue {
  /** The exact text flagged as an issue */
  quotedText: string;

  /** Type of issue identified */
  issueType: string;

  /** The reasoning for why this was flagged */
  reasoning: string;

  /** Approximate location in document (character offset) */
  locationOffset?: number;
}

export interface PrincipleOfCharityFilterOutput {
  /** Issues that remain valid even under charitable interpretation (keep flagging) */
  validIssues: CharityFilterResult[];

  /** Issues that dissolve under charitable interpretation (filter out) */
  dissolvedIssues: CharityFilterResult[];

  /** Unified usage metrics (includes cost, tokens, latency) */
  unifiedUsage?: UnifiedUsageMetrics;

  /** Actual API parameters sent */
  actualApiParams?: ActualApiParams;

  /** Response metrics */
  responseMetrics?: ApiResponseMetrics;
}

export interface CharityFilterResult {
  /** Index of the issue in the input array */
  index: number;

  /** Whether this issue remains valid under charitable interpretation */
  remainsValid: boolean;

  /** The charitable interpretation of the author's argument */
  charitableInterpretation: string;

  /** Explanation of why the issue does/doesn't hold under charitable interpretation */
  explanation: string;
}
