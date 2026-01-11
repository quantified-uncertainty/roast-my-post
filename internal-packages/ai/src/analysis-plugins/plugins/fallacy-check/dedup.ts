/**
 * Deduplication and prioritization utilities for fallacy issues
 *
 * Uses Jaccard word-overlap similarity with quality-based selection:
 * - When duplicates are found, keeps the higher-quality issue
 * - Quality based on text length (more context) + scores (severity, confidence, importance)
 */

import { logger } from "../../../shared/logger";
import type { FallacyIssue } from "./FallacyIssue";
import { LIMITS } from "./constants";

/** Similarity threshold for considering two issues as duplicates (70%) */
const JACCARD_THRESHOLD = 0.7;

/**
 * Calculate priority score for an issue.
 * Higher score = more important to address.
 */
export function calculatePriorityScore(issue: FallacyIssue): number {
  return issue.severityScore * 0.6 + issue.importanceScore * 0.4;
}

/**
 * Normalize text for comparison.
 * - Lowercase
 * - Collapse whitespace
 * - Trim
 */
export function normalizeTextForDedup(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Calculate Jaccard similarity between two texts based on word overlap.
 * Returns a value between 0 (no overlap) and 1 (identical).
 */
function calculateJaccardSimilarity(textA: string, textB: string): number {
  const wordsA = new Set(normalizeTextForDedup(textA).split(/\s+/).filter(Boolean));
  const wordsB = new Set(normalizeTextForDedup(textB).split(/\s+/).filter(Boolean));

  if (wordsA.size === 0 && wordsB.size === 0) return 1;
  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  let intersection = 0;
  for (const word of wordsA) {
    if (wordsB.has(word)) intersection++;
  }

  const union = wordsA.size + wordsB.size - intersection;
  return union > 0 ? intersection / union : 0;
}

/**
 * Compute a quality score for an issue.
 * Higher = better quality (prefer to keep).
 * Factors: text length (more context), severity, confidence, importance.
 */
function computeIssueQuality(issue: FallacyIssue): number {
  // Normalize text length (log scale to prevent extremely long texts from dominating)
  const lengthScore = Math.log10(issue.text.length + 1) / 4; // ~0.5-1.0 for typical lengths

  // Combine severity, confidence, importance (each 0-100, normalize to 0-1)
  const severityNorm = issue.severityScore / 100;
  const confidenceNorm = issue.confidenceScore / 100;
  const importanceNorm = issue.importanceScore / 100;

  // Weighted combination: prefer longer text, then higher scores
  // Length is most important (40%), then confidence (25%), severity (20%), importance (15%)
  return (
    lengthScore * 0.4 +
    confidenceNorm * 0.25 +
    severityNorm * 0.2 +
    importanceNorm * 0.15
  );
}

/**
 * Deduplicate issues using Jaccard word-overlap similarity.
 * When duplicates are found, keeps the higher-quality issue
 * (longer text + higher severity/confidence/importance).
 */
export function deduplicateIssues(issues: FallacyIssue[]): FallacyIssue[] {
  const unique: FallacyIssue[] = [];

  for (const issue of issues) {
    // Check if this issue is a duplicate of any already-kept issue
    let bestMatch: { keptIdx: number; kept: FallacyIssue; similarity: number } | null = null;

    for (let i = 0; i < unique.length; i++) {
      const kept = unique[i];
      const similarity = calculateJaccardSimilarity(issue.text, kept.text);

      if (similarity >= JACCARD_THRESHOLD) {
        if (!bestMatch || similarity > bestMatch.similarity) {
          bestMatch = { keptIdx: i, kept, similarity };
        }
      }
    }

    if (bestMatch) {
      // Found a duplicate - decide which to keep based on quality score
      const newQuality = computeIssueQuality(issue);
      const keptQuality = computeIssueQuality(bestMatch.kept);

      if (newQuality > keptQuality) {
        // New issue is better - swap: replace kept with new
        logger.debug(
          `[Dedup] Replacing issue (quality ${keptQuality.toFixed(2)}) with better duplicate (quality ${newQuality.toFixed(2)})`
        );
        unique[bestMatch.keptIdx] = issue;
      } else {
        // Kept issue is better - discard new
        logger.debug(
          `[Dedup] Discarding duplicate (quality ${newQuality.toFixed(2)}), keeping (quality ${keptQuality.toFixed(2)})`
        );
      }
    } else {
      unique.push(issue);
    }
  }

  if (unique.length < issues.length) {
    logger.info(
      `[Dedup] Reduced ${issues.length} issues to ${unique.length} unique (${issues.length - unique.length} duplicates removed)`
    );
  }

  return unique;
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
