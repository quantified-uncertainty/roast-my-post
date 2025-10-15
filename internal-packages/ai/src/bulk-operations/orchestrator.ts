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
 * Orchestrate bulk claim evaluations
 *
 * Process claims sequentially to handle variationOf dependencies
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

  const results: ClaimEvaluationResult[] = [];
  let successCount = 0;
  let failedCount = 0;

  // Process claims sequentially (to handle variationOf dependencies)
  for (let i = 0; i < claims.length; i++) {
    const claim = claims[i];
    context.logger.info(
      `[BulkClaimOperations] Processing claim ${i + 1}/${claims.length}: "${claim.claim.slice(0, 100)}..."`
    );

    try {
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
        userId: context.userId, // Already validated to exist
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

      // Track the created ID
      indexToId.set(i, saved.id);

      results.push({
        index: i,
        success: true,
        id: saved.id,
        claim: claim.claim,
      });

      successCount++;
      context.logger.info(
        `[BulkClaimOperations] Successfully created claim evaluation ${saved.id}`
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      context.logger.error(
        `[BulkClaimOperations] Failed to process claim ${i}:`,
        errorMessage
      );

      results.push({
        index: i,
        success: false,
        error: errorMessage,
        claim: claim.claim,
      });

      failedCount++;
    }
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
