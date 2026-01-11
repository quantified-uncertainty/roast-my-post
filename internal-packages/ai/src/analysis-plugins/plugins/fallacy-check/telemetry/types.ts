/**
 * Pipeline Telemetry Types
 *
 * Structured metrics for tracking fallacy check pipeline execution.
 * Used for observability, debugging, and regression detection.
 */

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
 * Telemetry for a single extractor run
 */
export interface ExtractorTelemetry {
  /** Unique extractor ID (e.g., "sonnet-0", "gemini-flash-1") */
  extractorId: string;

  /** Model used */
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

  /** Total issues before judge aggregation */
  totalIssuesBeforeJudge: number;

  /** Total issues after judge aggregation */
  totalIssuesAfterJudge: number;

  /** Model used for judge (if multi-extractor enabled) */
  judgeModel?: string;

  /** Judge execution time (if multi-extractor enabled) */
  judgeDurationMs?: number;

  /** Judge cost in USD (if available) */
  judgeCostUsd?: number;

  /** Detailed decisions for drill-down */
  judgeDecisions: JudgeDecisionRecord[];
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
}

/**
 * Stage names used in the fallacy check pipeline
 */
export const PIPELINE_STAGES = {
  EXTRACTION: 'extraction',
  DEDUPLICATION: 'deduplication',
  SUPPORTED_ELSEWHERE_FILTER: 'supported-elsewhere-filter',
  COMMENT_GENERATION: 'comment-generation',
  REVIEW: 'review',
} as const;

export type PipelineStage = typeof PIPELINE_STAGES[keyof typeof PIPELINE_STAGES];
