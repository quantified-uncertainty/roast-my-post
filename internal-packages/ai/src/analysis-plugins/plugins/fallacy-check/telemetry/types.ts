/**
 * Pipeline Telemetry Types
 *
 * Structured metrics for tracking fallacy check pipeline execution.
 * Used for observability, debugging, and regression detection.
 */

import type { UnifiedUsageMetrics } from '../../../../utils/usageMetrics';

/**
 * Metrics for a single pipeline stage
 */
export interface StageMetrics {
  /** Stage name (e.g., 'extraction', 'supported-elsewhere-filter') */
  stageName: string;

  /** Duration of the stage in milliseconds */
  durationMs: number;

  /** Number of items going into this stage */
  inputCount: number;

  /** Number of items coming out of this stage */
  outputCount: number;

  /** Number of items filtered/removed by this stage */
  filteredCount: number;

  /** Estimated cost in dollars (if applicable) */
  costUsd?: number;

  /** Model used for this stage (if applicable) */
  model?: string;

  /** Any error that occurred during this stage */
  error?: string;

  /** Additional stage-specific metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Details about a filtered item (issue or comment)
 */
export interface FilteredItemRecord {
  /** Stage where filtering occurred */
  stage: string;

  /** Original text that was flagged */
  quotedText: string;

  /** Header/type of the issue */
  header?: string;

  /** Why this item was filtered */
  filterReason: string;

  /** Where support was found (for supported-elsewhere filter) */
  supportLocation?: string;

  /** Original index in the input array */
  originalIndex: number;
}

// ============================================================================
// Multi-Extractor Telemetry Types
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
    effort?: 'none' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh';
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

/**
 * Telemetry for a single extractor run
 */
export interface ExtractorTelemetry {
  /** Unique extractor ID (e.g., "sonnet-0", "gemini-flash-1") */
  extractorId: string;

  /** Model used */
  model: string;

  /**
   * @deprecated Use actualApiParams.temperature instead
   * Effective temperature used for this extractor.
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
   * @deprecated Use actualApiParams for actual thinking config
   * Whether extended thinking/reasoning was enabled.
   */
  thinkingEnabled: boolean;

  /** Number of issues found by this extractor */
  issuesFound: number;

  /** Execution time in milliseconds */
  durationMs: number;

  /** Cost in USD (if available) */
  costUsd?: number;

  /** Error message if extraction failed */
  error?: string;

  /** Breakdown of issues by type */
  issuesByType: Record<string, number>;

  /**
   * Actual API request parameters as sent to the provider.
   * Captured right before the API call - this is the source of truth.
   */
  actualApiParams?: ActualApiParams;

  /**
   * Response metrics from the API call.
   */
  responseMetrics?: ApiResponseMetrics;

  /**
   * Unified usage metrics (includes cost, tokens, latency).
   * This provides a consistent format across all providers (OpenRouter, Anthropic).
   * The costUsd is directly from API for OpenRouter, calculated for Anthropic.
   */
  unifiedUsage?: UnifiedUsageMetrics;
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
 * Complete telemetry for the extraction phase (multi-extractor mode)
 */
export interface ExtractionPhaseTelemetry {
  /** Whether multi-extractor mode was used */
  multiExtractorEnabled: boolean;

  /** Per-extractor breakdown */
  extractors: ExtractorTelemetry[];

  /** Total issues from all extractors (before dedup) */
  totalIssuesBeforeJudge: number;

  /** Total issues after Jaccard deduplication (before judge) */
  totalIssuesAfterDedup?: number;

  /** Total issues after judge aggregation (final output) */
  totalIssuesAfterJudge: number;

  /** Model used for judge (if multi-extractor enabled) */
  judgeModel?: string;

  /** Judge execution time (if multi-extractor enabled) */
  judgeDurationMs?: number;

  /** Judge cost in USD (if available) */
  judgeCostUsd?: number;

  /** Unified usage metrics for the judge (if multi-extractor enabled) */
  judgeUnifiedUsage?: UnifiedUsageMetrics;

  /** Detailed decisions for drill-down */
  judgeDecisions: JudgeDecisionRecord[];
}

// ============================================================================
// Profile Info
// ============================================================================

/**
 * Information about the profile used for this execution
 */
export interface ProfileInfo {
  /** Profile ID from database (if loaded from DB) */
  profileId?: string;

  /** Agent ID used for profile loading */
  agentId: string;

  /** Threshold configuration from profile */
  thresholds: {
    minSeverityThreshold: number;
    maxIssues: number;
    dedupThreshold: number;
    maxIssuesToProcess: number;
  };

  /** Number of extractors configured */
  extractorCount: number;

  /** Whether judge is enabled */
  judgeEnabled: boolean;

  /** Whether custom prompts are configured in the profile */
  hasCustomPrompts: boolean;
}

// ============================================================================
// Pipeline Execution Record
// ============================================================================

/**
 * Complete pipeline execution record
 */
export interface PipelineExecutionRecord {
  /** Unique identifier for this execution */
  executionId: string;

  /** Timestamp when pipeline started */
  startedAt: string;

  /** Timestamp when pipeline completed */
  completedAt: string;

  /** Total duration of the entire pipeline in milliseconds */
  totalDurationMs: number;

  /** Document length in characters */
  documentLength: number;

  /** Metrics for each stage, in order of execution */
  stages: StageMetrics[];

  /** Final counts */
  finalCounts: {
    /** Total issues extracted initially */
    issuesExtracted: number;
    /** Issues after deduplication */
    issuesAfterDedup: number;
    /** Issues after all filtering */
    issuesAfterFiltering: number;
    /** Final comments generated */
    commentsGenerated: number;
    /** Comments kept after review */
    commentsKept: number;
  };

  /** Overall success/failure status */
  success: boolean;

  /** Error message if pipeline failed */
  error?: string;

  /** Total estimated cost in dollars */
  totalCostUsd?: number;

  /** Pipeline version (for tracking changes over time) */
  pipelineVersion: string;

  /** Details about items that were filtered out (for debugging/validation) */
  filteredItems?: FilteredItemRecord[];

  /** Detailed extraction phase telemetry (multi-extractor mode) */
  extractionPhase?: ExtractionPhaseTelemetry;

  /** Profile configuration used for this execution */
  profileInfo?: ProfileInfo;
}

/**
 * Stage names used in the fallacy check pipeline
 */
export const PIPELINE_STAGES = {
  EXTRACTION: 'extraction',
  DEDUPLICATION: 'deduplication',
  PRINCIPLE_OF_CHARITY_FILTER: 'principle-of-charity-filter',
  SUPPORTED_ELSEWHERE_FILTER: 'supported-elsewhere-filter',
  COMMENT_GENERATION: 'comment-generation',
  REVIEW: 'review',
} as const;

export type PipelineStage = typeof PIPELINE_STAGES[keyof typeof PIPELINE_STAGES];
