/**
 * Types for Validation Framework
 *
 * Used to compare pipeline runs and detect regressions.
 */

/**
 * A document selected for validation testing
 */
export interface ValidationDocument {
  documentId: string;
  title: string;
  contentLength: number;
  lastEvaluatedAt: Date | null;
  evaluationCount: number;
}

/**
 * Simplified comment for comparison purposes
 */
export interface ComparableComment {
  id: string;
  quotedText: string;
  header: string | null;
  description: string;
  importance: number | null;
  startOffset: number;
  endOffset: number;
}

/**
 * An evaluation snapshot for comparison
 */
export interface EvaluationSnapshot {
  evaluationVersionId: string;
  agentId: string;
  agentName: string;
  createdAt: Date;
  documentId: string;
  documentTitle: string;
  comments: ComparableComment[];
  grade: number | null;
  pipelineTelemetry: PipelineTelemetrySnapshot | null;
}

/**
 * Simplified telemetry for comparison
 */
export interface PipelineTelemetrySnapshot {
  totalDurationMs: number;
  issuesExtracted: number;
  issuesAfterDedup: number;
  issuesAfterFiltering: number;
  commentsGenerated: number;
  commentsKept: number;
}

/**
 * Result of comparing a single comment between runs
 */
export interface CommentComparisonResult {
  status: "matched" | "new" | "lost";
  baselineComment?: ComparableComment;
  currentComment?: ComparableComment;
  matchConfidence?: number; // 0-1 for fuzzy matches
}

/**
 * Result of comparing two evaluation snapshots
 */
export interface DocumentComparisonResult {
  documentId: string;
  documentTitle: string;
  baseline: EvaluationSnapshot;
  current: EvaluationSnapshot;

  // Comment-level changes
  matchedComments: CommentComparisonResult[];
  newComments: ComparableComment[];
  lostComments: ComparableComment[];

  // Aggregate metrics
  scoreChange: number | null; // current - baseline (null if either missing)
  commentCountChange: number; // current - baseline

  // Pipeline telemetry changes
  extractionChange: number | null; // % change in issues extracted
  durationChange: number | null; // ms change

  // Regression flags
  regressions: RegressionFlag[];
}

/**
 * A specific regression detected
 */
export interface RegressionFlag {
  type: RegressionType;
  severity: "warning" | "error";
  message: string;
  details?: Record<string, unknown>;
}

export type RegressionType =
  | "score_drop"
  | "lost_comments"
  | "lost_high_importance"
  | "extraction_drop"
  | "duration_spike";

/**
 * Thresholds for regression detection
 */
export const REGRESSION_THRESHOLDS = {
  // Score drop > 1 point is a regression
  SCORE_DROP: 1,
  // Losing > 50% of comments is a regression
  LOST_COMMENTS_PERCENT: 50,
  // Any lost comment with importance > 70 is a regression
  HIGH_IMPORTANCE_THRESHOLD: 70,
  // Extraction dropping > 30% is a regression
  EXTRACTION_DROP_PERCENT: 30,
  // Duration increase > 100% is a warning
  DURATION_SPIKE_PERCENT: 100,
} as const;

/**
 * Summary of a validation run
 */
export interface ValidationRunSummary {
  runId: string;
  createdAt: Date;
  description: string;
  documentCount: number;

  // Aggregate results
  noRegressionCount: number;
  warningCount: number;
  errorCount: number;

  // Can be set as new baseline
  canBeBaseline: boolean;
}

/**
 * Full validation run with all comparisons
 */
export interface ValidationRun {
  summary: ValidationRunSummary;
  comparisons: DocumentComparisonResult[];
}

/**
 * Input for creating a validation run
 */
export interface CreateValidationRunInput {
  description: string;
  documentIds: string[];
  agentId: string;
  baselineRunId?: string; // If not specified, uses most recent for each doc
}
