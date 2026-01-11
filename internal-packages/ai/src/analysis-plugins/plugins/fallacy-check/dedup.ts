/**
 * Deduplication and prioritization utilities for fallacy issues
 */

import { logger } from "../../../shared/logger";
import type { FallacyIssue } from "./FallacyIssue";
import { LIMITS } from "./constants";

/**
 * Calculate priority score for an issue.
 * Higher score = more important to address.
 */
export function calculatePriorityScore(issue: FallacyIssue): number {
  return issue.severityScore * 0.6 + issue.importanceScore * 0.4;
}

/**
 * Deduplicate issues by removing exact text matches.
 * Uses case-insensitive, whitespace-normalized comparison.
 *
 * TODO: This is too strict - different extractors quoting slightly different
 * portions of the same passage won't match. Consider fuzzy matching.
 */
export function deduplicateIssues(issues: FallacyIssue[]): FallacyIssue[] {
  const seen = new Set<string>();
  const unique: FallacyIssue[] = [];

  for (const issue of issues) {
    const key = normalizeTextForDedup(issue.text);
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(issue);
    }
  }

  return unique;
}

/**
 * Normalize text for deduplication comparison.
 * - Lowercase
 * - Collapse whitespace
 * - Trim
 */
export function normalizeTextForDedup(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Prioritize and limit issues based on severity and importance scores.
 * - Sorts by priority score (highest first)
 * - Limits to MAX_ISSUES_TO_PROCESS if too many
 */
export function prioritizeAndLimitIssues(issues: FallacyIssue[]): FallacyIssue[] {
  // Sort by priority score (most important issues first)
  const sortedIssues = [...issues].sort(
    (a, b) => calculatePriorityScore(b) - calculatePriorityScore(a)
  );

  // Limit to maximum issues if we have too many
  if (sortedIssues.length > LIMITS.MAX_ISSUES_TO_PROCESS) {
    logger.info(
      `Limiting issues from ${sortedIssues.length} to ${LIMITS.MAX_ISSUES_TO_PROCESS} based on priority scores`
    );

    const keptIssues = sortedIssues.slice(0, LIMITS.MAX_ISSUES_TO_PROCESS);
    const discardedIssues = sortedIssues.slice(LIMITS.MAX_ISSUES_TO_PROCESS);

    const avgKeptScore =
      keptIssues.reduce((sum, i) => sum + calculatePriorityScore(i), 0) /
      keptIssues.length;
    const avgDiscardedScore =
      discardedIssues.length > 0
        ? discardedIssues.reduce((sum, i) => sum + calculatePriorityScore(i), 0) /
          discardedIssues.length
        : 0;

    logger.debug(
      `Priority scores - Kept issues avg: ${avgKeptScore.toFixed(1)}, ` +
        `Discarded issues avg: ${avgDiscardedScore.toFixed(1)}`
    );

    return keptIssues;
  }

  return sortedIssues;
}

/**
 * Full deduplication pipeline: deduplicate, then prioritize and limit.
 */
export function deduplicateAndPrioritize(issues: FallacyIssue[]): FallacyIssue[] {
  const deduplicated = deduplicateIssues(issues);
  return prioritizeAndLimitIssues(deduplicated);
}
