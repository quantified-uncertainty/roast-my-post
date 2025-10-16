import { NextRequest } from "next/server";
import { prisma, generateId } from '@roast/db';
import { claimEvaluatorTool, analyzeClaimEvaluation } from '@roast/ai/server';
import type { ClaimEvaluatorOutput } from '@roast/ai/server';
import { logger as aiLogger } from '@roast/ai';
import { authenticateRequest } from "@/infrastructure/auth/auth-helpers";
import { getUserIdWithDevBypass } from "@/infrastructure/auth/dev-bypass";
import { logger } from "@/infrastructure/logging/logger";
import { errorResponse, successResponse, commonErrors } from "@/infrastructure/http/api-response-helpers";
import { strictRateLimit, getClientIdentifier } from "@/infrastructure/http/rate-limiter";
import { z } from 'zod';

const runSchema = z.object({
  claim: z.string().min(1),
  context: z.string().optional(),
  models: z.array(z.string()).optional(),
  runs: z.number().int().min(1).optional(),
  temperature: z.number().min(0).max(1).optional(),
  explanationLength: z.number().int().min(1).optional(),
  variationOf: z.string().optional(),
  submitterNotes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  promptTemplate: z.string().max(50000).optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientId = getClientIdentifier(request);
    const { success } = await strictRateLimit.check(clientId);
    if (!success) {
      return errorResponse("Too many requests", 429);
    }

    // Authenticate request (API key first, then session) with dev bypass
    const authenticatedUserId = await authenticateRequest(request);
    const userId = await getUserIdWithDevBypass(authenticatedUserId, 'claim evaluation run');

    if (!userId) {
      return errorResponse("User must be logged in to run claim evaluations", 401);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return commonErrors.badRequest("Invalid JSON in request body");
    }

    const data = runSchema.parse(body);

    // Execute the claim evaluation tool
    logger.info(`Running claim evaluation for user ${userId}`, { claim: data.claim });

    const result = await claimEvaluatorTool.execute(
      {
        claim: data.claim,
        context: data.context,
        models: data.models,
        runs: data.runs,
        temperature: data.temperature,
        explanationLength: data.explanationLength,
        promptTemplate: data.promptTemplate,
      },
      {
        userId,
        logger: aiLogger,
      }
    ) as ClaimEvaluatorOutput;

    // Generate analysis (continue without analysis if it fails - analysis is a nice-to-have on creation)
    let analysisText: string | null = null;
    let analysisGeneratedAt: Date | null = null;

    try {
      logger.info(`Generating analysis for claim evaluation`);
      const analysis = await analyzeClaimEvaluation({
        claim: data.claim,
        context: data.context,
        rawOutput: result,
      });
      analysisText = analysis.analysisText;
      analysisGeneratedAt = new Date();
      logger.info(`Generated analysis successfully`);
    } catch (error) {
      logger.error('Failed to generate analysis (non-fatal):', error);
      // Continue without analysis - analysis generation failing should not prevent evaluation creation
    }

    // Save to database
    const evaluation = await prisma.claimEvaluation.create({
      data: {
        id: generateId(16),
        userId,
        claim: data.claim,
        context: data.context,
        summaryMean: result.summary?.mean,
        rawOutput: result as any,
        explanationLength: data.explanationLength,
        temperature: data.temperature,
        prompt: null,
        variationOf: data.variationOf,
        submitterNotes: data.submitterNotes,
        tags: data.tags || [],
        analysisText,
        analysisGeneratedAt,
      },
    });

    logger.info(`Saved claim evaluation ${evaluation.id}`);

    return successResponse({
      id: evaluation.id,
      result,
      analysisText,
    });
  } catch (error) {
    logger.error('Error in claim evaluation run API:', error);

    if (error instanceof z.ZodError) {
      return errorResponse(
        `Invalid request data: ${error.errors.map(e => e.message).join(', ')}`,
        400
      );
    }

    return errorResponse(
      error instanceof Error ? error.message : "Failed to run claim evaluation",
      500
    );
  }
}
