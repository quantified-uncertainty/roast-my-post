import { claimEvaluatorTool } from '../tools/claim-evaluator';
import type { ToolContext } from '../tools/base/Tool';
import type { ClaimEvaluatorOutput } from '../tools/claim-evaluator/utils';
import type {
  ExpandedClaim,
  ClaimEvaluationResult,
  BulkClaimResult,
} from './claim-schema';

/**
 * Result from creating a single claim evaluation
 */
interface CreateClaimResult {
  success: boolean;
  id?: string;
  error?: string;
  result?: ClaimEvaluatorOutput;
}

/**
 * Function type for saving a claim evaluation to the database
 * This is injected from the API layer
 */
export type SaveClaimEvaluationFn = (params: {
  userId: string;
  claim: string;
  context?: string;
  summaryMean?: number;
  rawOutput: ClaimEvaluatorOutput;
  explanationLength?: number;
  temperature?: number;
  variationOf?: string;
  submitterNotes?: string;
  tags: string[];
  analysisText: string | null;
  analysisGeneratedAt: Date | null;
}) => Promise<{ id: string }>;

/**
 * Group claims into batches based on variationOf dependencies
 * Returns batches where each batch can be processed in parallel
 */
function groupClaimsByDependencies(claims: ExpandedClaim[]): number[][] {
  const batches: number[][] = [];
  const completed = new Set<number>();

  while (completed.size < claims.length) {
    const batch: number[] = [];

    for (let i = 0; i < claims.length; i++) {
      if (completed.has(i)) continue; // Already processed

      const claim = claims[i];

      // No dependency - can process
      if (!claim.variationOf) {
        batch.push(i);
        continue;
      }

      // Has dependency - check if parent is completed
      if (typeof claim.variationOf === 'number') {
        const parentIndex = claim.variationOf;
        if (completed.has(parentIndex)) {
          batch.push(i);
        }
      } else {
        // Direct ID reference (not index) - can process (parent already exists)
        batch.push(i);
      }
    }

    if (batch.length === 0) {
      // No progress possible - circular dependency or invalid reference
      throw new Error(
        `Unable to resolve dependencies. Remaining claims: ${Array.from({length: claims.length}, (_, i) => i).filter(i => !completed.has(i)).join(', ')}`
      );
    }

    batches.push(batch);
    batch.forEach(i => completed.add(i));
  }

  return batches;
}

/**
 * Orchestrate bulk claim evaluations
 *
 * Process claims in parallel batches based on variationOf dependencies
 * Map temporary indices to actual database IDs
 */
export async function executeBulkClaimOperations(
  claims: ExpandedClaim[],
  context: ToolContext,
  saveClaimEvaluation: SaveClaimEvaluationFn
): Promise<BulkClaimResult> {
  // Ensure userId is present
  if (!context.userId) {
    throw new Error('userId is required in context for bulk claim operations');
  }

  // Map from original index to created ID
  const indexToId = new Map<number, string>();

  const results: ClaimEvaluationResult[] = new Array(claims.length);
  let successCount = 0;
  let failedCount = 0;

  // Group claims into dependency-based batches
  const batches = groupClaimsByDependencies(claims);

  context.logger.info(
    `[BulkClaimOperations] Processing ${claims.length} claims in ${batches.length} parallel batches`
  );

  // Process each batch in parallel
  for (let batchNum = 0; batchNum < batches.length; batchNum++) {
    const batch = batches[batchNum];
    context.logger.info(
      `[BulkClaimOperations] Batch ${batchNum + 1}/${batches.length}: Processing ${batch.length} claims in parallel`
    );

    // Process all claims in this batch in parallel
    const batchResults = await Promise.allSettled(
      batch.map(async (i) => {
        const claim = claims[i];
        context.logger.info(
          `[BulkClaimOperations] Processing claim ${i + 1}/${claims.length}: "${claim.claim.slice(0, 100)}..."`
        );

        // Resolve variationOf if it's an index reference
        let variationOfId: string | undefined;
        if (claim.variationOf !== undefined) {
          if (typeof claim.variationOf === 'number') {
            // Index reference
            const parentIndex = claim.variationOf;
            if (parentIndex < 0 || parentIndex >= claims.length) {
              throw new Error(
                `Invalid variationOf index ${parentIndex}. Must be between 0 and ${claims.length - 1}`
              );
            }
            if (parentIndex >= i) {
              throw new Error(
                `Invalid variationOf index ${parentIndex}. Cannot reference a claim that hasn't been created yet (current index: ${i})`
              );
            }

            variationOfId = indexToId.get(parentIndex);
            if (!variationOfId) {
              throw new Error(
                `Cannot create variation: parent claim at index ${parentIndex} failed to create`
              );
            }
          } else {
            // Direct ID reference
            variationOfId = claim.variationOf;
          }
        }

        // Execute claim evaluation
        const evaluationResult = await claimEvaluatorTool.execute(
          {
            claim: claim.claim,
            context: claim.context,
            models: claim.models,
            runs: claim.runs,
            temperature: claim.temperature,
            explanationLength: claim.explanationLength,
            promptTemplate: claim.promptTemplate,
          },
          context
        );

        // Save to database
        const saved = await saveClaimEvaluation({
          userId: context.userId!, // Already validated to exist at function start
          claim: claim.claim,
          context: claim.context,
          summaryMean: evaluationResult.summary?.mean ?? undefined,
          rawOutput: evaluationResult,
          explanationLength: claim.explanationLength,
          temperature: claim.temperature,
          variationOf: variationOfId,
          submitterNotes: claim.submitterNotes,
          tags: claim.tags || [],
          analysisText: null,
          analysisGeneratedAt: null,
        });

        context.logger.info(
          `[BulkClaimOperations] Successfully created claim evaluation ${saved.id}`
        );

        return {
          index: i,
          id: saved.id,
        };
      })
    );

    // Process batch results
    batchResults.forEach((result, idx) => {
      const i = batch[idx];
      const claim = claims[i];

      if (result.status === 'fulfilled') {
        // Success
        const { id } = result.value;
        indexToId.set(i, id);
        results[i] = {
          index: i,
          success: true,
          id,
          claim: claim.claim,
        };
        successCount++;
      } else {
        // Failure
        const errorMessage = result.reason instanceof Error
          ? result.reason.message
          : String(result.reason);

        context.logger.error(
          `[BulkClaimOperations] Failed to process claim ${i}:`,
          errorMessage
        );

        results[i] = {
          index: i,
          success: false,
          error: errorMessage,
          claim: claim.claim,
        };
        failedCount++;
      }
    });

    context.logger.info(
      `[BulkClaimOperations] Batch ${batchNum + 1} complete: ${batch.length} claims processed`
    );
  }

  context.logger.info(
    `[BulkClaimOperations] Completed: ${successCount} successful, ${failedCount} failed out of ${claims.length} total`
  );

  return {
    total: claims.length,
    successful: successCount,
    failed: failedCount,
    results,
  };
}
