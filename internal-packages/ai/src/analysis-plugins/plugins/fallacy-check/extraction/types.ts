/**
 * Multi-Extractor Types
 *
 * Configuration and result types for running multiple fallacy extractors
 * in parallel with LLM judge aggregation.
 */

import type { ExtractedFallacyIssue } from '../../../../tools/fallacy-extractor/types';
import type { UnifiedUsageMetrics } from '../../../../utils/usageMetrics';

// Re-export common types for backwards compatibility
export {
  type ReasoningEffort,
  type ReasoningConfig,
  type ProviderPreferences,
  type ActualApiParams,
  type ApiResponseMetrics,
  EFFORT_TO_BUDGET_TOKENS,
} from '../../../../types/common';

import type {
  ReasoningConfig,
  ProviderPreferences,
  ActualApiParams,
  ApiResponseMetrics,
} from '../../../../types/common';

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Configuration for a single extractor instance
 */
export interface ExtractorConfig {
  /** Model ID (Claude or OpenRouter format) */
  model: string;

  /**
   * Temperature setting:
   * - undefined: Use model-specific default (0 for Claude, 0.1 for OpenRouter)
   * - number: Use this specific temperature
   * - "default": Let the model use its own default (don't pass temperature)
   */
  temperature?: number | 'default';

  /** Optional display label (auto-generated if not provided) */
  label?: string;

  /**
   * @deprecated Use reasoning instead
   * Whether to enable extended thinking/reasoning mode.
   * - true (default): Enable extended thinking (Claude) / reasoning (OpenRouter/Gemini)
   * - false: Disable extended thinking for faster, cheaper responses
   */
  thinking?: boolean;

  /**
   * Reasoning/thinking configuration (preferred over thinking boolean)
   * - undefined: Use default (thinking enabled)
   * - false: Disable thinking
   * - { effort: ReasoningEffort }: Use effort level
   * - { budget_tokens: number }: Custom token budget
   */
  reasoning?: ReasoningConfig;

  /**
   * Provider routing preferences (OpenRouter only)
   * Allows specifying preferred providers for a model
   */
  provider?: ProviderPreferences;
}

/**
 * Judge configuration from FALLACY_JUDGE env var
 *
 * Example:
 * FALLACY_JUDGE='{"model":"google/gemini-3-flash-preview","temperature":"default","thinking":false,"enabled":true}'
 */
export interface JudgeConfig {
  /** Model to use (Claude or OpenRouter format) */
  model: string;

  /** Temperature (number or "default" for model's native default) */
  temperature?: number | 'default';

  /**
   * @deprecated Use reasoning instead
   * Enable extended thinking/reasoning
   */
  thinking?: boolean;

  /**
   * Reasoning/thinking configuration (preferred over thinking boolean)
   */
  reasoning?: ReasoningConfig;

  /**
   * Provider routing preferences (OpenRouter only)
   */
  provider?: ProviderPreferences;

  /** Whether the judge is enabled */
  enabled: boolean;
}

/**
 * Threshold configuration for extraction filtering
 */
export interface ExtractionThresholds {
  /** Minimum severity score to include (0-100, default: 60) */
  minSeverityThreshold?: number;

  /** Maximum issues to return per extractor (default: 15) */
  maxIssues?: number;
}

/**
 * Configuration for multi-extractor execution
 */
export interface MultiExtractorConfig {
  /** List of extractor configurations to run in parallel */
  extractors: ExtractorConfig[];

  /** Judge configuration */
  judge: JudgeConfig;

  /** Threshold configuration applied to each extractor */
  thresholds?: ExtractionThresholds;
}

// ============================================================================
// Extractor Result Types
// ============================================================================

/**
 * Result from a single extractor run
 */
export interface ExtractorResult {
  /** Unique identifier for this extractor (e.g., "sonnet-t0", "gemini-flash-t0.1") */
  extractorId: string;

  /** The configuration used for this extractor */
  config: ExtractorConfig;

  /** Issues extracted by this model */
  issues: ExtractedFallacyIssue[];

  /** Execution time in milliseconds */
  durationMs: number;

  /** Cost in USD (if available) */
  costUsd?: number;

  /** Error message if extraction failed */
  error?: string;

  /** Actual parameters sent to the API (source of truth) */
  actualApiParams?: ActualApiParams;

  /** Response metrics from the API call */
  responseMetrics?: ApiResponseMetrics;

  /** Unified usage metrics (includes cost, tokens, latency) */
  unifiedUsage?: UnifiedUsageMetrics;
}

/**
 * Combined result from running multiple extractors in parallel
 */
export interface MultiExtractorResult {
  /** Results from each extractor */
  extractorResults: ExtractorResult[];

  /** Wall clock time (parallel execution) */
  totalDurationMs: number;

  /** Total issues across all extractors (before dedup/judge) */
  totalIssuesFound: number;
}

// ============================================================================
// Judge Types
// ============================================================================

/**
 * Reference to an issue from a specific extractor
 */
export interface ExtractorIssueRef {
  extractorId: string;
  issue: ExtractedFallacyIssue;
}

/**
 * An issue after judge evaluation with provenance tracking
 */
export interface JudgedIssue {
  /** The final merged/selected issue */
  issue: ExtractedFallacyIssue;

  /** Which extractors found this or similar issues */
  sourceExtractors: string[];

  /** The original issues that were merged/deduplicated into this one */
  originalIssues: ExtractorIssueRef[];

  /** Judge's decision */
  decision: 'accepted' | 'merged' | 'rejected';

  /** Judge's reasoning for this decision */
  reasoning: string;
}

/**
 * Output from the LLM judge aggregator
 */
export interface JudgeOutput {
  /** Issues accepted by the judge */
  acceptedIssues: JudgedIssue[];

  /** Issues rejected by the judge (for telemetry) */
  rejectedIssues: JudgedIssue[];

  /** Judge execution time */
  durationMs: number;

  /** Judge cost in USD (if available) */
  costUsd?: number;

  /** Unified usage metrics for the judge */
  unifiedUsage?: UnifiedUsageMetrics;
}

// ============================================================================
// Telemetry Types
// ============================================================================

/**
 * Telemetry for a single extractor
 */
export interface ExtractorTelemetry {
  extractorId: string;
  model: string;

  /**
   * Effective temperature used for this extractor.
   * This is the actual value sent to the API (resolved from config).
   */
  temperature: number;

  /**
   * Original temperature configuration.
   * - "default": Model's native default was used
   * - number: Explicit temperature was configured
   * - undefined: Our model-specific default was used
   */
  temperatureConfig?: number | 'default';

  /**
   * Whether extended thinking/reasoning was enabled.
   * - true: Thinking enabled (Claude) / high reasoning (OpenRouter)
   * - false: Thinking disabled for faster, cheaper responses
   */
  thinkingEnabled: boolean;

  issuesFound: number;
  durationMs: number;
  costUsd?: number;
  error?: string;

  /** Breakdown of issues by type */
  issuesByType: Record<string, number>;
}

/**
 * Record of a judge decision (for drill-down)
 */
export interface JudgeDecisionRecord {
  /** The quoted text from the issue */
  issueText: string;

  /** Issue type (e.g., "logical-fallacy", "missing-context") */
  issueType: string;

  /** Judge's decision */
  decision: 'accepted' | 'merged' | 'rejected';

  /** Judge's reasoning */
  reasoning: string;

  /** Which extractors found this issue */
  sourceExtractors: string[];

  /** Final severity after judge assessment */
  finalSeverity?: number;

  /** Final confidence after judge assessment */
  finalConfidence?: number;
}

/**
 * Complete telemetry for the extraction phase
 */
export interface ExtractionPhaseTelemetry {
  /** Per-extractor breakdown */
  extractors: ExtractorTelemetry[];

  /** Total issues before judge aggregation */
  totalIssuesBeforeJudge: number;

  /** Total issues after judge aggregation */
  totalIssuesAfterJudge: number;

  /** Model used for judge */
  judgeModel: string;

  /** Judge execution time */
  judgeDurationMs: number;

  /** Judge cost in USD */
  judgeCostUsd?: number;

  /** Detailed decisions for drill-down */
  judgeDecisions: JudgeDecisionRecord[];
}
