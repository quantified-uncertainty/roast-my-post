/**
 * Extraction Pipeline
 *
 * Shared function that encapsulates the full extraction pipeline:
 * 1. Multi-extractor (parallel extraction with multiple models)
 * 2. Jaccard deduplication
 * 3. Optional LLM judge aggregation
 * 4. Priority sort and limit
 *
 * Used by both the fallacy-check plugin and the MCP fallacy_extract tool.
 */

import { logger } from '../../../../shared/logger';
import fallacyJudgeTool from '../../../../tools/fallacy-judge';
import { decisionToIssue } from '../../../../tools/fallacy-judge/types';
import type { JudgeDecision } from '../../../../tools/fallacy-judge/types';
import type { ExtractedFallacyIssue } from '../../../../tools/fallacy-extractor/types';
import { runMultiExtractor, deduplicateExtractedIssues } from './multiExtractor';
import type {
  MultiExtractorConfig,
  ExtractorResult,
} from './types';

// ============================================================================
// Pipeline Types
// ============================================================================

export interface ExtractionPipelineInput {
  /** Full document text to analyze */
  documentText: string;

  /** Multi-extractor configuration (extractors, judge, thresholds, customPrompts) */
  config: MultiExtractorConfig;
}

export interface ExtractionPipelineResult {
  /** Final issues after dedup + optional judge + priority sort */
  issues: ExtractedFallacyIssue[];

  /** Per-extractor results for telemetry */
  extractorResults: ExtractorResult[];

  /** Dedup metrics */
  dedup: { before: number; after: number; removedCount: number };

  /** Judge results (only if judge ran) */
  judge?: {
    acceptedCount: number;
    rejectedCount: number;
    decisions: JudgeDecision[];
  };

  /** Total wall-clock time */
  totalDurationMs: number;
}

// ============================================================================
// Pipeline Implementation
// ============================================================================

/**
 * Run the full extraction pipeline:
 * 1. Run multiple extractors in parallel
 * 2. Flatten & deduplicate issues (Jaccard similarity)
 * 3. Optionally run LLM judge for consensus aggregation
 * 4. Sort by priority (severity × 0.6 + importance × 0.4), cap at maxIssues
 */
export async function runExtractionPipeline(
  input: ExtractionPipelineInput
): Promise<ExtractionPipelineResult> {
  const startTime = Date.now();
  const { documentText, config } = input;

  // Step 1: Run all extractors in parallel
  const multiResult = await runMultiExtractor(documentText, config);

  // Step 2: Flatten issues from successful extractors and deduplicate
  const successfulExtractors = multiResult.extractorResults.filter((r) => !r.error);
  const allExtractedIssues = successfulExtractors.flatMap((r) => r.issues);

  if (allExtractedIssues.length === 0) {
    return {
      issues: [],
      extractorResults: multiResult.extractorResults,
      dedup: { before: 0, after: 0, removedCount: 0 },
      totalDurationMs: Date.now() - startTime,
    };
  }

  // Always run Jaccard deduplication
  const dedupResult = deduplicateExtractedIssues(allExtractedIssues);

  logger.info(
    `[ExtractionPipeline] Deduplication: ${allExtractedIssues.length} → ${dedupResult.deduplicated.length} issues (${dedupResult.removedCount} removed)`
  );

  let finalIssues: ExtractedFallacyIssue[];
  let judgeInfo: ExtractionPipelineResult['judge'] | undefined;

  // Step 3: Optionally run LLM judge
  if (!config.judge.enabled) {
    logger.info(`[ExtractionPipeline] Judge disabled, using deduplicated issues`);
    finalIssues = dedupResult.deduplicated;
  } else {
    const judgeInput = {
      documentText,
      issues: dedupResult.deduplicated.map((issue) => ({
        extractorId: 'deduped',
        exactText: issue.exactText,
        issueType: issue.issueType,
        fallacyType: issue.fallacyType,
        severityScore: issue.severityScore,
        confidenceScore: issue.confidenceScore,
        importanceScore: issue.importanceScore,
        reasoning: issue.reasoning,
      })),
      extractorIds: successfulExtractors.map((r) => r.extractorId),
      judgeConfig: {
        model: config.judge.model,
        temperature: config.judge.temperature,
        thinking: resolveThinkingForJudge(config.judge),
        reasoning: config.judge.reasoning,
        provider: config.judge.provider,
        enabled: true,
      },
    };

    logger.info(
      `[ExtractionPipeline] Running LLM judge on ${judgeInput.issues.length} deduplicated issues`
    );

    const judgeResult = await fallacyJudgeTool.execute(judgeInput, { logger });

    finalIssues = judgeResult.acceptedDecisions.map((d) => decisionToIssue(d));

    const allDecisions = [
      ...judgeResult.acceptedDecisions,
      ...judgeResult.rejectedDecisions,
    ];

    judgeInfo = {
      acceptedCount: judgeResult.acceptedDecisions.length,
      rejectedCount: judgeResult.rejectedDecisions.length,
      decisions: allDecisions,
    };

    logger.info(
      `[ExtractionPipeline] Judge complete: ${judgeInfo.acceptedCount} accepted, ${judgeInfo.rejectedCount} rejected`
    );
  }

  // Step 4: Priority sort and cap
  const maxIssues = config.thresholds?.maxIssues ?? 25;
  const sorted = [...finalIssues].sort((a, b) => {
    const pa = a.severityScore * 0.6 + a.importanceScore * 0.4;
    const pb = b.severityScore * 0.6 + b.importanceScore * 0.4;
    return pb - pa;
  });
  const capped = sorted.slice(0, maxIssues);

  if (capped.length < sorted.length) {
    logger.info(
      `[ExtractionPipeline] Capped issues from ${sorted.length} to ${capped.length} (maxIssues=${maxIssues})`
    );
  }

  return {
    issues: capped,
    extractorResults: multiResult.extractorResults,
    dedup: {
      before: allExtractedIssues.length,
      after: dedupResult.deduplicated.length,
      removedCount: dedupResult.removedCount,
    },
    judge: judgeInfo,
    totalDurationMs: Date.now() - startTime,
  };
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Resolve thinking boolean for judge config.
 * Checks reasoning config first, falls back to thinking boolean.
 */
function resolveThinkingForJudge(judge: MultiExtractorConfig['judge']): boolean {
  if (judge.reasoning !== undefined) {
    if (judge.reasoning === false) return false;
    return true;
  }
  return judge.thinking !== false;
}
