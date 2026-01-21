/**
 * Multi-Extractor Runner
 *
 * Runs multiple fallacy extractors in parallel and aggregates results.
 * Supports different models and/or temperatures for diversity.
 */

import { logger } from '../../../../shared/logger';
import fallacyExtractorTool from '../../../../tools/fallacy-extractor';
import type { ExtractedFallacyIssue } from '../../../../tools/fallacy-extractor/types';
import type {
  ExtractorConfig,
  MultiExtractorConfig,
  ExtractorResult,
  MultiExtractorResult,
  ExtractionThresholds,
  ReasoningConfig,
} from './types';
import { generateExtractorId, getDefaultTemperature } from './config';
import { JACCARD_SIMILARITY_THRESHOLD, type ReasoningEffort } from '../../../../types/common';

/**
 * Resolve reasoning config to thinking boolean and reasoning effort level.
 *
 * @param reasoning - The reasoning config from profile
 * @param thinking - The deprecated thinking boolean (fallback)
 * @returns Object with thinkingEnabled and optional reasoningEffort
 */
function resolveReasoning(
  reasoning: ReasoningConfig | undefined,
  thinking?: boolean
): { thinkingEnabled: boolean; reasoningEffort?: ReasoningEffort } {
  // New reasoning config takes precedence
  if (reasoning !== undefined) {
    // false = disabled
    if (reasoning === false) {
      return { thinkingEnabled: false, reasoningEffort: 'none' };
    }
    // Effort level specified
    if ('effort' in reasoning) {
      return { thinkingEnabled: true, reasoningEffort: reasoning.effort };
    }
    // Budget tokens specified - use xhigh (we can't pass custom budget to OpenRouter)
    if ('budget_tokens' in reasoning) {
      return { thinkingEnabled: true, reasoningEffort: 'xhigh' };
    }
  }

  // Fall back to legacy thinking boolean (default true)
  if (thinking === false) {
    return { thinkingEnabled: false, reasoningEffort: 'none' };
  }

  // Default: enabled without explicit effort (let model decide)
  return { thinkingEnabled: true };
}

/**
 * Run a single extractor with the given configuration
 */
async function runSingleExtractor(
  documentText: string,
  config: ExtractorConfig,
  extractorId: string,
  thresholds?: ExtractionThresholds
): Promise<ExtractorResult> {
  const startTime = Date.now();

  // Handle temperature: "default" means don't pass, undefined means use our default
  const temperatureForLog = config.temperature === 'default'
    ? 'default'
    : (typeof config.temperature === 'number' ? config.temperature : getDefaultTemperature(config.model));

  // Resolve thinking and reasoning effort from config
  const { thinkingEnabled, reasoningEffort } = resolveReasoning(config.reasoning, config.thinking);

  logger.info(`[MultiExtractor] Starting extractor: ${extractorId}`, {
    model: config.model,
    temperature: temperatureForLog,
    thinking: thinkingEnabled,
    reasoningEffort,
    reasoning: config.reasoning,
    documentLength: documentText.length,
    minSeverityThreshold: thresholds?.minSeverityThreshold,
    maxIssues: thresholds?.maxIssues,
  });

  try {
    const result = await fallacyExtractorTool.execute(
      {
        documentText,
        model: config.model,
        // Pass temperature as-is (can be number, "default", or undefined)
        temperature: config.temperature,
        // Pass resolved thinking value (new reasoning takes precedence over legacy thinking)
        thinking: thinkingEnabled,
        // Pass reasoning effort for OpenRouter models
        reasoningEffort,
        // Pass thresholds from profile config
        minSeverityThreshold: thresholds?.minSeverityThreshold,
        maxIssues: thresholds?.maxIssues,
        // Pass provider preferences for OpenRouter
        ...(config.provider && { provider: config.provider }),
      },
      { logger }
    );

    const durationMs = Date.now() - startTime;

    logger.info(`[MultiExtractor] Extractor ${extractorId} completed`, {
      issuesFound: result.issues.length,
      durationMs,
      wasComplete: result.wasComplete,
    });

    return {
      extractorId,
      config,
      issues: result.issues,
      durationMs,
      actualApiParams: result.actualApiParams,
      responseMetrics: result.responseMetrics,
      unifiedUsage: result.unifiedUsage,
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    logger.error(`[MultiExtractor] Extractor ${extractorId} failed`, {
      error: errorMessage,
      durationMs,
    });

    return {
      extractorId,
      config,
      issues: [],
      durationMs,
      error: errorMessage,
    };
  }
}

/**
 * Run multiple extractors in parallel
 *
 * @param documentText - Full document text to analyze
 * @param config - Multi-extractor configuration
 * @returns Combined results from all extractors
 */
export async function runMultiExtractor(
  documentText: string,
  config: MultiExtractorConfig
): Promise<MultiExtractorResult> {
  const startTime = Date.now();
  const { extractors } = config;

  logger.info(`[MultiExtractor] Starting parallel extraction`, {
    extractorCount: extractors.length,
    documentLength: documentText.length,
  });

  // Generate unique IDs for each extractor
  const extractorsWithIds = extractors.map((ext, index) => ({
    config: ext,
    extractorId: generateExtractorId(ext, index, extractors),
  }));

  // Run all extractors in parallel
  const extractorPromises = extractorsWithIds.map(({ config: extConfig, extractorId }) =>
    runSingleExtractor(documentText, extConfig, extractorId, config.thresholds)
  );

  const settledResults = await Promise.allSettled(extractorPromises);

  // Process results
  const extractorResults: ExtractorResult[] = settledResults.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    }

    // Promise rejection (shouldn't happen since we catch inside runSingleExtractor)
    const extConfig = extractorsWithIds[index];
    return {
      extractorId: extConfig.extractorId,
      config: extConfig.config,
      issues: [],
      durationMs: 0,
      error: result.reason instanceof Error ? result.reason.message : String(result.reason),
    };
  });

  const totalDurationMs = Date.now() - startTime;
  const totalIssuesFound = extractorResults.reduce(
    (sum, r) => sum + r.issues.length,
    0
  );

  // Log summary
  const successCount = extractorResults.filter((r) => !r.error).length;
  const failedCount = extractorResults.filter((r) => r.error).length;

  logger.info(`[MultiExtractor] Parallel extraction complete`, {
    totalDurationMs,
    totalIssuesFound,
    successCount,
    failedCount,
    extractorSummaries: extractorResults.map((r) => ({
      extractorId: r.extractorId,
      issuesFound: r.issues.length,
      durationMs: r.durationMs,
      error: r.error,
    })),
  });

  return {
    extractorResults,
    totalDurationMs,
    totalIssuesFound,
  };
}

/**
 * Flatten all issues from multi-extractor results with source tracking
 *
 * @param result - Multi-extractor result
 * @returns Array of issues with extractorId attached
 */
export function flattenExtractorIssues(
  result: MultiExtractorResult
): Array<ExtractedFallacyIssue & { extractorId: string }> {
  const allIssues: Array<ExtractedFallacyIssue & { extractorId: string }> = [];

  for (const extractor of result.extractorResults) {
    for (const issue of extractor.issues) {
      allIssues.push({
        ...issue,
        extractorId: extractor.extractorId,
      });
    }
  }

  return allIssues;
}

/**
 * Normalize text for comparison.
 */
function normalizeTextForDedup(text: string | undefined | null): string {
  if (!text) return '';
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
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
 * Compute a quality score for an extracted issue.
 * Higher = better quality (prefer to keep).
 */
function computeExtractedIssueQuality(issue: ExtractedFallacyIssue): number {
  const textLength = issue.exactText?.length ?? 0;
  const lengthScore = Math.log10(textLength + 1) / 4;
  const severityNorm = (issue.severityScore ?? 0) / 100;
  const confidenceNorm = (issue.confidenceScore ?? 0) / 100;
  const importanceNorm = (issue.importanceScore ?? 0) / 100;

  return (
    lengthScore * 0.4 +
    confidenceNorm * 0.25 +
    severityNorm * 0.2 +
    importanceNorm * 0.15
  );
}

/**
 * Deduplicate extracted issues using Jaccard word-overlap similarity.
 * When duplicates are found, keeps the higher-quality issue.
 *
 * This runs BEFORE the judge to reduce the number of issues it needs to process.
 */
export function deduplicateExtractedIssues(
  issues: ExtractedFallacyIssue[]
): { deduplicated: ExtractedFallacyIssue[]; removedCount: number } {
  // Filter out issues with no text (malformed responses from LLM)
  const validIssues = issues.filter(issue => issue.exactText && issue.exactText.trim().length > 0);
  if (validIssues.length < issues.length) {
    logger.info(`[Dedup] Filtered out ${issues.length - validIssues.length} issues with empty/missing text`);
  }

  const unique: ExtractedFallacyIssue[] = [];

  for (const issue of validIssues) {
    let bestMatch: { keptIdx: number; kept: ExtractedFallacyIssue; similarity: number } | null = null;

    for (let i = 0; i < unique.length; i++) {
      const kept = unique[i];
      const similarity = calculateJaccardSimilarity(issue.exactText, kept.exactText);

      if (similarity >= JACCARD_SIMILARITY_THRESHOLD) {
        if (!bestMatch || similarity > bestMatch.similarity) {
          bestMatch = { keptIdx: i, kept, similarity };
        }
      }
    }

    if (bestMatch) {
      const newQuality = computeExtractedIssueQuality(issue);
      const keptQuality = computeExtractedIssueQuality(bestMatch.kept);

      if (newQuality > keptQuality) {
        unique[bestMatch.keptIdx] = issue;
      }
    } else {
      unique.push(issue);
    }
  }

  const duplicatesRemoved = validIssues.length - unique.length;
  const totalRemoved = issues.length - unique.length;
  if (duplicatesRemoved > 0) {
    logger.info(`[Dedup] Reduced ${validIssues.length} issues to ${unique.length} (${duplicatesRemoved} duplicates removed)`);
  }

  return { deduplicated: unique, removedCount: totalRemoved };
}
