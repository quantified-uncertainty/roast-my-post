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
} from './types';
import { generateExtractorId, getDefaultTemperature } from './config';

/**
 * Run a single extractor with the given configuration
 */
async function runSingleExtractor(
  documentText: string,
  config: ExtractorConfig,
  extractorId: string
): Promise<ExtractorResult> {
  const startTime = Date.now();

  // Handle temperature: "default" means don't pass, undefined means use our default
  const temperatureForLog = config.temperature === 'default'
    ? 'default'
    : (typeof config.temperature === 'number' ? config.temperature : getDefaultTemperature(config.model));

  logger.info(`[MultiExtractor] Starting extractor: ${extractorId}`, {
    model: config.model,
    temperature: temperatureForLog,
    thinking: config.thinking !== false,
    documentLength: documentText.length,
  });

  try {
    const result = await fallacyExtractorTool.execute(
      {
        documentText,
        model: config.model,
        // Pass temperature as-is (can be number, "default", or undefined)
        temperature: config.temperature,
        // Pass thinking parameter (undefined or boolean)
        thinking: config.thinking,
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
      // TODO: Add cost tracking from API response when available
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
    runSingleExtractor(documentText, extConfig, extractorId)
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
 * Group issues by their quoted text for deduplication
 * Issues with similar text (after normalization) are grouped together
 *
 * @param issues - Flattened issues with extractor IDs
 * @returns Map of normalized text to array of issues
 */
export function groupIssuesByText(
  issues: Array<ExtractedFallacyIssue & { extractorId: string }>
): Map<string, Array<ExtractedFallacyIssue & { extractorId: string }>> {
  const groups = new Map<string, Array<ExtractedFallacyIssue & { extractorId: string }>>();

  for (const issue of issues) {
    // Normalize text for comparison
    const normalizedText = issue.exactText
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();

    const existing = groups.get(normalizedText);
    if (existing) {
      existing.push(issue);
    } else {
      groups.set(normalizedText, [issue]);
    }
  }

  return groups;
}

/**
 * Simple majority-vote deduplication (for use when judge is disabled)
 * Keeps issues found by multiple extractors OR high-confidence single-source issues
 *
 * @param result - Multi-extractor result
 * @param options - Dedup options
 * @returns Deduplicated issues
 */
export function simpleDeduplication(
  result: MultiExtractorResult,
  options: {
    /** Minimum extractors that must agree for low-confidence issues */
    minAgreement?: number;
    /** Confidence threshold for single-source acceptance */
    singleSourceConfidenceThreshold?: number;
  } = {}
): ExtractedFallacyIssue[] {
  const {
    minAgreement = 2,
    singleSourceConfidenceThreshold = 85,
  } = options;

  const flatIssues = flattenExtractorIssues(result);
  const grouped = groupIssuesByText(flatIssues);
  const deduped: ExtractedFallacyIssue[] = [];

  for (const [, issues] of grouped) {
    const sourceCount = new Set(issues.map((i) => i.extractorId)).size;

    // Keep if multiple extractors found it
    if (sourceCount >= minAgreement) {
      // Pick the issue with highest confidence
      const bestIssue = issues.reduce((best, current) =>
        current.confidenceScore > best.confidenceScore ? current : best
      );
      deduped.push(bestIssue);
      continue;
    }

    // Keep single-source issues only if high confidence
    const bestIssue = issues[0];
    if (bestIssue.confidenceScore >= singleSourceConfidenceThreshold) {
      deduped.push(bestIssue);
    }
  }

  return deduped;
}
