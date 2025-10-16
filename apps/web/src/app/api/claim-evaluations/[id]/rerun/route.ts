import { NextRequest } from "next/server";
import { prisma } from '@roast/db';
import { claimEvaluatorTool } from '@roast/ai/server';
import type { ClaimEvaluatorOutput } from '@roast/ai/server';
import { logger as aiLogger } from '@roast/ai';
import { authenticateRequest } from "@/infrastructure/auth/auth-helpers";
import { getUserIdWithDevBypass } from "@/infrastructure/auth/dev-bypass";
import { logger } from "@/infrastructure/logging/logger";
import { errorResponse, successResponse, commonErrors } from "@/infrastructure/http/api-response-helpers";
import { strictRateLimit, getClientIdentifier } from "@/infrastructure/http/rate-limiter";
import { z } from 'zod';

const rerunSchema = z.object({
  additionalRuns: z.number().int().min(1).max(10).optional(),
  models: z.array(z.string()).optional(),
  temperature: z.number().min(0).max(1).optional(),
});

/**
 * POST /api/claim-evaluations/[id]/rerun
 *
 * Re-run evaluation for an existing claim with additional LLM runs
 * Merges new results into the existing rawOutput
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Rate limiting
    const clientId = getClientIdentifier(request);
    const { success } = await strictRateLimit.check(clientId);
    if (!success) {
      return errorResponse("Too many requests", 429);
    }

    // Authenticate request (API key first, then session) with dev bypass
    const authenticatedUserId = await authenticateRequest(request);
    const userId = await getUserIdWithDevBypass(authenticatedUserId, 'claim evaluation rerun');

    if (!userId) {
      return errorResponse("User must be logged in to rerun claim evaluations", 401);
    }

    // Get claim ID
    const { id } = await params;

    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch {
      return commonErrors.badRequest("Invalid JSON in request body");
    }

    const data = rerunSchema.parse(body);

    // Fetch existing claim evaluation
    const existingClaim = await prisma.claimEvaluation.findUnique({
      where: { id },
    });

    if (!existingClaim) {
      return errorResponse("Claim evaluation not found", 404);
    }

    // Check ownership
    if (existingClaim.userId !== userId) {
      return errorResponse("You don't have permission to rerun this claim evaluation", 403);
    }

    logger.info(`Re-running claim evaluation ${id} for user ${userId}`, {
      additionalRuns: data.additionalRuns,
      models: data.models,
    });

    // Get original evaluation data
    const originalRawOutput = existingClaim.rawOutput as unknown as ClaimEvaluatorOutput;

    // Determine models to use (from request, or original, or defaults)
    const modelsToUse = data.models ||
      (originalRawOutput.evaluations.length > 0
        ? Array.from(new Set(originalRawOutput.evaluations.map(e => e.model)))
        : undefined);

    // Determine runs (default to 1 if not specified)
    const runsToUse = data.additionalRuns || 1;

    // Determine temperature (from request, or original, or default)
    const temperatureToUse = data.temperature ?? existingClaim.temperature ?? 0.7;

    // Execute additional evaluations
    logger.info(`Running additional evaluations with ${modelsToUse?.length || 'default'} models, ${runsToUse} runs`);

    const newEvaluationResult = await claimEvaluatorTool.execute(
      {
        claim: existingClaim.claim,
        context: existingClaim.context || undefined,
        models: modelsToUse,
        runs: runsToUse,
        temperature: temperatureToUse,
        explanationLength: existingClaim.explanationLength || undefined,
      },
      {
        userId,
        logger: aiLogger,
      }
    );

    // Merge new evaluations with existing ones
    const mergedEvaluations = [
      ...originalRawOutput.evaluations,
      ...newEvaluationResult.evaluations,
    ];

    // Recalculate summary statistics
    const successfulEvaluations = mergedEvaluations.filter(e => !e.hasError && e.successfulResponse);
    let newSummary: { mean: number } | undefined;

    if (successfulEvaluations.length > 0) {
      const agreements = successfulEvaluations.map(e => e.successfulResponse!.agreement);
      const mean = agreements.reduce((sum, val) => sum + val, 0) / agreements.length;
      newSummary = { mean };
    }

    const mergedRawOutput: ClaimEvaluatorOutput = {
      evaluations: mergedEvaluations,
      summary: newSummary,
    };

    // Update claim evaluation in database
    const updatedClaim = await prisma.claimEvaluation.update({
      where: { id },
      data: {
        rawOutput: mergedRawOutput as any,
        summaryMean: newSummary?.mean,
        updatedAt: new Date(),
      },
    });

    logger.info(`Successfully re-ran claim evaluation ${id}`, {
      totalEvaluations: mergedEvaluations.length,
      newEvaluations: newEvaluationResult.evaluations.length,
      summaryMean: newSummary?.mean,
    });

    return successResponse({
      id: updatedClaim.id,
      totalEvaluations: mergedEvaluations.length,
      addedEvaluations: newEvaluationResult.evaluations.length,
      summary: newSummary,
    });
  } catch (error) {
    logger.error('Error in claim evaluation rerun API:', error);

    if (error instanceof z.ZodError) {
      return errorResponse(
        `Invalid request data: ${error.errors.map(e => e.message).join(', ')}`,
        400
      );
    }

    return errorResponse(
      error instanceof Error ? error.message : "Failed to rerun claim evaluation",
      500
    );
  }
}
