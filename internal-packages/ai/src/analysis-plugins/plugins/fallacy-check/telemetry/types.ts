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
