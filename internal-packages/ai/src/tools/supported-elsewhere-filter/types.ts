/**
 * Supported Elsewhere Filter Types
 *
 * This filter checks if claims or arguments flagged as issues are actually
 * supported, explained, or qualified elsewhere in the document. Common in
 * well-structured writing where intro claims are backed up later.
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

export interface SupportedElsewhereFilterInput {
  /** Full document text to search for support */
  documentText: string;

  /** Issues to check for support elsewhere */
  issues: SupportedElsewhereIssue[];

  /**
   * Optional model to use for filtering.
   * Can be a Claude model (default) or an OpenRouter model ID.
   * Examples: "claude-sonnet-4-20250514", "google/gemini-3-flash-preview"
   */
  model?: string;

  /** Temperature for the LLM (0-2). Default is 0.1 for precise filtering. */
  temperature?: number;

  /** Reasoning/thinking configuration for Claude models */
  reasoning?: ReasoningConfig;

  /** Provider routing preferences (OpenRouter only) */
  provider?: ProviderPreferences;

  /** Custom system prompt (overrides default) */
  customPrompt?: string;
}

export interface SupportedElsewhereIssue {
  /** The exact text flagged as an issue */
  quotedText: string;

  /** Type of issue identified */
  issueType: string;

  /** The reasoning for why this was flagged */
  reasoning: string;

  /** Approximate location in document (character offset) */
  locationOffset?: number;
}

export interface SupportedElsewhereFilterOutput {
  /** Issues that are NOT supported elsewhere (keep flagging) */
  unsupportedIssues: SupportedElsewhereResult[];

  /** Issues that ARE supported elsewhere (filter out) */
  supportedIssues: SupportedElsewhereResult[];

  /** Unified usage metrics (includes cost, tokens, latency) */
  unifiedUsage?: UnifiedUsageMetrics;

  /** Actual API parameters sent */
  actualApiParams?: ActualApiParams;

  /** Response metrics */
  responseMetrics?: ApiResponseMetrics;
}

export interface SupportedElsewhereResult {
  /** Index of the issue in the input array */
  index: number;

  /** Whether this issue is supported elsewhere in the document */
  isSupported: boolean;

  /** Where the support was found (if applicable) */
  supportLocation?: string;

  /** Brief explanation of the support or lack thereof */
  explanation: string;
}
