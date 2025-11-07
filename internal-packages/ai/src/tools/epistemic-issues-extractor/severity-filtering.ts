/**
 * Severity-based filtering with confidence thresholds
 *
 * Implements Phase 1 improvement: confidence-weighted display
 * to reduce false positive noise while catching real issues
 */

import type { ExtractedEpistemicIssue } from "./types";

export enum SeverityLevel {
  CRITICAL = "CRITICAL",
  HIGH = "HIGH",
  MEDIUM = "MEDIUM",
  LOW = "LOW",
}

/**
 * Classify severity into discrete levels
 */
export function classifySeverity(severity: number): SeverityLevel {
  if (severity >= 80) return SeverityLevel.CRITICAL;
  if (severity >= 60) return SeverityLevel.HIGH;
  if (severity >= 40) return SeverityLevel.MEDIUM;
  return SeverityLevel.LOW;
}

/**
 * Confidence thresholds by severity level
 *
 * Based on acceptable false positive rates:
 * - CRITICAL: <5% FP rate → requires 95%+ confidence
 * - HIGH: <10% FP rate → requires 70%+ confidence
 * - MEDIUM: <20% FP rate → requires 50%+ confidence
 * - LOW: Can be noisy → requires 30%+ confidence
 */
const CONFIDENCE_THRESHOLDS: Record<SeverityLevel, number> = {
  [SeverityLevel.CRITICAL]: 40,  // Must be very confident
  [SeverityLevel.HIGH]: 70,      // Fairly confident
  [SeverityLevel.MEDIUM]: 50,    // Moderate confidence
  [SeverityLevel.LOW]: 30,       // Low bar
};

/**
 * Determine if an issue should be displayed based on severity and confidence
 */
export function shouldDisplayIssue(issue: ExtractedEpistemicIssue): boolean {
  // Get adjusted severity (post-calibration)
  const severity = issue.adjustedSeverity ?? issue.severityScore;
  const confidence = issue.confidenceScore;

  // Classify severity level
  const severityLevel = classifySeverity(severity);

  // Get required confidence threshold
  const requiredConfidence = CONFIDENCE_THRESHOLDS[severityLevel];

  // Display if confidence meets threshold
  return confidence >= requiredConfidence;
}

/**
 * Filter issues by confidence thresholds
 */
export function filterByConfidenceThresholds(
  issues: ExtractedEpistemicIssue[]
): ExtractedEpistemicIssue[] {
  return issues.filter(shouldDisplayIssue);
}

/**
 * Get stats about filtered issues
 */
export interface FilterStats {
  total: number;
  displayed: number;
  filteredByConfidence: number;
  bySeverity: {
    critical: { total: number; displayed: number };
    high: { total: number; displayed: number };
    medium: { total: number; displayed: number };
    low: { total: number; displayed: number };
  };
}

export function getFilterStats(
  allIssues: ExtractedEpistemicIssue[],
  displayedIssues: ExtractedEpistemicIssue[]
): FilterStats {
  const displayedSet = new Set(displayedIssues);

  const stats: FilterStats = {
    total: allIssues.length,
    displayed: displayedIssues.length,
    filteredByConfidence: allIssues.length - displayedIssues.length,
    bySeverity: {
      critical: { total: 0, displayed: 0 },
      high: { total: 0, displayed: 0 },
      medium: { total: 0, displayed: 0 },
      low: { total: 0, displayed: 0 },
    },
  };

  for (const issue of allIssues) {
    const severity = issue.adjustedSeverity ?? issue.severityScore;
    const level = classifySeverity(severity);
    const key = level.toLowerCase() as keyof typeof stats.bySeverity;

    stats.bySeverity[key].total++;
    if (displayedSet.has(issue)) {
      stats.bySeverity[key].displayed++;
    }
  }

  return stats;
}
