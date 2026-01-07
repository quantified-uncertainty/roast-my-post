/**
 * Comparison Logic for Validation Framework
 *
 * Compares evaluation snapshots and detects regressions.
 */

import type {
  ComparableComment,
  EvaluationSnapshot,
  PipelineTelemetrySnapshot,
  CommentComparisonResult,
  DocumentComparisonResult,
  RegressionFlag,
  RegressionType,
} from "./types";
import { REGRESSION_THRESHOLDS } from "./types";

/**
 * Calculate similarity between two strings using Levenshtein distance.
 * Returns a value between 0 (completely different) and 1 (identical).
 */
function stringSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length === 0 || b.length === 0) return 0;

  // Normalize strings for comparison
  const normalize = (s: string) => s.toLowerCase().trim();
  const normA = normalize(a);
  const normB = normalize(b);

  if (normA === normB) return 1;

  // Calculate Levenshtein distance
  const matrix: number[][] = [];
  for (let i = 0; i <= normA.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= normB.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= normA.length; i++) {
    for (let j = 1; j <= normB.length; j++) {
      const cost = normA[i - 1] === normB[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  const maxLen = Math.max(normA.length, normB.length);
  return 1 - matrix[normA.length][normB.length] / maxLen;
}

/**
 * Check if two comments match based on quoted text.
 * Uses fuzzy matching since quoted text might vary slightly between runs.
 */
function commentsMatch(
  a: ComparableComment,
  b: ComparableComment,
  threshold = 0.8
): { matches: boolean; confidence: number } {
  // First try exact match on quoted text
  if (a.quotedText === b.quotedText) {
    return { matches: true, confidence: 1 };
  }

  // Check if offset ranges overlap significantly
  const overlapStart = Math.max(a.startOffset, b.startOffset);
  const overlapEnd = Math.min(a.endOffset, b.endOffset);
  const overlap = Math.max(0, overlapEnd - overlapStart);
  const unionLength =
    Math.max(a.endOffset, b.endOffset) - Math.min(a.startOffset, b.startOffset);
  const overlapRatio = unionLength > 0 ? overlap / unionLength : 0;

  // If offsets overlap significantly, check text similarity
  if (overlapRatio > 0.5) {
    const textSimilarity = stringSimilarity(a.quotedText, b.quotedText);
    if (textSimilarity >= threshold) {
      return { matches: true, confidence: textSimilarity };
    }
  }

  // Fallback: pure text similarity for comments on same region
  const textSimilarity = stringSimilarity(a.quotedText, b.quotedText);
  if (textSimilarity >= threshold) {
    return { matches: true, confidence: textSimilarity };
  }

  return { matches: false, confidence: textSimilarity };
}

/**
 * Match comments between baseline and current snapshots.
 * Returns matched pairs, new comments, and lost comments.
 */
function matchComments(
  baseline: ComparableComment[],
  current: ComparableComment[]
): {
  matched: CommentComparisonResult[];
  newComments: ComparableComment[];
  lostComments: ComparableComment[];
} {
  const matched: CommentComparisonResult[] = [];
  const unmatchedBaseline = new Set(baseline.map((_, i) => i));
  const unmatchedCurrent = new Set(current.map((_, i) => i));

  // Greedy matching: find best match for each baseline comment
  for (let i = 0; i < baseline.length; i++) {
    let bestMatch: { index: number; confidence: number } | null = null;

    for (let j = 0; j < current.length; j++) {
      if (!unmatchedCurrent.has(j)) continue;

      const result = commentsMatch(baseline[i], current[j]);
      if (result.matches) {
        if (!bestMatch || result.confidence > bestMatch.confidence) {
          bestMatch = { index: j, confidence: result.confidence };
        }
      }
    }

    if (bestMatch) {
      matched.push({
        status: "matched",
        baselineComment: baseline[i],
        currentComment: current[bestMatch.index],
        matchConfidence: bestMatch.confidence,
      });
      unmatchedBaseline.delete(i);
      unmatchedCurrent.delete(bestMatch.index);
    }
  }

  // Remaining baseline comments are "lost"
  const lostComments = Array.from(unmatchedBaseline).map((i) => baseline[i]);

  // Remaining current comments are "new"
  const newComments = Array.from(unmatchedCurrent).map((i) => current[i]);

  return { matched, newComments, lostComments };
}

/**
 * Extract telemetry snapshot from raw pipeline telemetry.
 */
function extractTelemetrySnapshot(
  raw: unknown
): PipelineTelemetrySnapshot | null {
  if (!raw || typeof raw !== "object") return null;

  const telemetry = raw as Record<string, unknown>;
  const finalCounts = telemetry.finalCounts as Record<string, number> | undefined;

  if (!finalCounts) return null;

  return {
    totalDurationMs: (telemetry.totalDurationMs as number) || 0,
    issuesExtracted: finalCounts.issuesExtracted || 0,
    issuesAfterDedup: finalCounts.issuesAfterDedup || 0,
    issuesAfterFiltering: finalCounts.issuesAfterFiltering || 0,
    commentsGenerated: finalCounts.commentsGenerated || 0,
    commentsKept: finalCounts.commentsKept || 0,
  };
}

/**
 * Detect regressions between baseline and current telemetry.
 */
function detectTelemetryRegressions(
  baseline: PipelineTelemetrySnapshot | null,
  current: PipelineTelemetrySnapshot | null
): RegressionFlag[] {
  const regressions: RegressionFlag[] = [];

  if (!baseline || !current) return regressions;

  // Extraction drop
  if (baseline.issuesExtracted > 0) {
    const extractionDropPercent =
      ((baseline.issuesExtracted - current.issuesExtracted) /
        baseline.issuesExtracted) *
      100;

    if (extractionDropPercent >= REGRESSION_THRESHOLDS.EXTRACTION_DROP_PERCENT) {
      regressions.push({
        type: "extraction_drop",
        severity: "error",
        message: `Extraction dropped ${extractionDropPercent.toFixed(0)}% (${baseline.issuesExtracted} → ${current.issuesExtracted})`,
        details: {
          baselineCount: baseline.issuesExtracted,
          currentCount: current.issuesExtracted,
          dropPercent: extractionDropPercent,
        },
      });
    }
  }

  // Duration spike
  if (baseline.totalDurationMs > 0) {
    const durationIncreasePercent =
      ((current.totalDurationMs - baseline.totalDurationMs) /
        baseline.totalDurationMs) *
      100;

    if (durationIncreasePercent >= REGRESSION_THRESHOLDS.DURATION_SPIKE_PERCENT) {
      regressions.push({
        type: "duration_spike",
        severity: "warning",
        message: `Duration increased ${durationIncreasePercent.toFixed(0)}% (${baseline.totalDurationMs}ms → ${current.totalDurationMs}ms)`,
        details: {
          baselineMs: baseline.totalDurationMs,
          currentMs: current.totalDurationMs,
          increasePercent: durationIncreasePercent,
        },
      });
    }
  }

  return regressions;
}

/**
 * Compare two evaluation snapshots and detect regressions.
 */
export function compareSnapshots(
  baseline: EvaluationSnapshot,
  current: EvaluationSnapshot
): DocumentComparisonResult {
  // Match comments
  const { matched, newComments, lostComments } = matchComments(
    baseline.comments,
    current.comments
  );

  // Calculate aggregate metrics
  const scoreChange =
    baseline.grade !== null && current.grade !== null
      ? current.grade - baseline.grade
      : null;

  const commentCountChange = current.comments.length - baseline.comments.length;

  // Extract telemetry
  const baselineTelemetry = extractTelemetrySnapshot(baseline.pipelineTelemetry);
  const currentTelemetry = extractTelemetrySnapshot(current.pipelineTelemetry);

  const extractionChange =
    baselineTelemetry && currentTelemetry && baselineTelemetry.issuesExtracted > 0
      ? ((currentTelemetry.issuesExtracted - baselineTelemetry.issuesExtracted) /
          baselineTelemetry.issuesExtracted) *
        100
      : null;

  const durationChange =
    baselineTelemetry && currentTelemetry
      ? currentTelemetry.totalDurationMs - baselineTelemetry.totalDurationMs
      : null;

  // Detect regressions
  const regressions: RegressionFlag[] = [];

  // Score drop
  if (scoreChange !== null && scoreChange < -REGRESSION_THRESHOLDS.SCORE_DROP) {
    regressions.push({
      type: "score_drop",
      severity: "error",
      message: `Score dropped by ${Math.abs(scoreChange).toFixed(1)} (${baseline.grade} → ${current.grade})`,
      details: {
        baselineScore: baseline.grade,
        currentScore: current.grade,
        drop: Math.abs(scoreChange),
      },
    });
  }

  // Lost comments threshold
  if (baseline.comments.length > 0) {
    const lostPercent =
      (lostComments.length / baseline.comments.length) * 100;

    if (lostPercent >= REGRESSION_THRESHOLDS.LOST_COMMENTS_PERCENT) {
      regressions.push({
        type: "lost_comments",
        severity: "error",
        message: `Lost ${lostPercent.toFixed(0)}% of comments (${lostComments.length}/${baseline.comments.length})`,
        details: {
          lostCount: lostComments.length,
          baselineCount: baseline.comments.length,
          lostPercent,
        },
      });
    }
  }

  // High-importance comments lost
  const highImportanceLost = lostComments.filter(
    (c) =>
      c.importance !== null &&
      c.importance >= REGRESSION_THRESHOLDS.HIGH_IMPORTANCE_THRESHOLD
  );

  if (highImportanceLost.length > 0) {
    regressions.push({
      type: "lost_high_importance",
      severity: "error",
      message: `Lost ${highImportanceLost.length} high-importance comment(s)`,
      details: {
        lostComments: highImportanceLost.map((c) => ({
          header: c.header,
          importance: c.importance,
          quotedText: c.quotedText.slice(0, 50),
        })),
      },
    });
  }

  // Telemetry regressions
  regressions.push(
    ...detectTelemetryRegressions(baselineTelemetry, currentTelemetry)
  );

  return {
    documentId: baseline.documentId,
    documentTitle: baseline.documentTitle,
    baseline,
    current,
    matchedComments: matched,
    newComments,
    lostComments,
    scoreChange,
    commentCountChange,
    extractionChange,
    durationChange,
    regressions,
  };
}

/**
 * Determine overall status from regressions.
 */
export function getComparisonStatus(
  result: DocumentComparisonResult
): "ok" | "warning" | "error" {
  const hasError = result.regressions.some((r) => r.severity === "error");
  const hasWarning = result.regressions.some((r) => r.severity === "warning");

  if (hasError) return "error";
  if (hasWarning) return "warning";
  return "ok";
}

/**
 * Format a comparison result for display.
 */
export function formatComparisonSummary(
  result: DocumentComparisonResult
): string {
  const status = getComparisonStatus(result);
  const icon = status === "ok" ? "✅" : status === "warning" ? "⚠️" : "❌";

  const parts = [
    `${icon} ${result.documentTitle}`,
    `  Comments: ${result.baseline.comments.length} → ${result.current.comments.length}`,
  ];

  if (result.scoreChange !== null) {
    const sign = result.scoreChange >= 0 ? "+" : "";
    parts.push(`  Score: ${result.baseline.grade} → ${result.current.grade} (${sign}${result.scoreChange.toFixed(1)})`);
  }

  if (result.newComments.length > 0) {
    parts.push(`  New: ${result.newComments.length}`);
  }

  if (result.lostComments.length > 0) {
    parts.push(`  Lost: ${result.lostComments.length}`);
  }

  for (const regression of result.regressions) {
    const rIcon = regression.severity === "error" ? "🔴" : "🟡";
    parts.push(`  ${rIcon} ${regression.message}`);
  }

  return parts.join("\n");
}
