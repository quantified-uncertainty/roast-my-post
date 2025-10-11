import { NextRequest } from "next/server";
import { prisma, generateId } from '@roast/db';
import { claimEvaluatorTool } from '@roast/ai/server';
import type { ClaimEvaluatorOutput } from '@roast/ai/server';
import { logger as aiLogger } from '@roast/ai';
import { authenticateRequest } from "@/infrastructure/auth/auth-helpers";
import { logger } from "@/infrastructure/logging/logger";
import { errorResponse, successResponse, commonErrors } from "@/infrastructure/http/api-response-helpers";
import { strictRateLimit, getClientIdentifier } from "@/infrastructure/http/rate-limiter";
import { config } from '@roast/domain';
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
});

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientId = getClientIdentifier(request);
    const { success } = await strictRateLimit.check(clientId);
    if (!success) {
      return errorResponse("Too many requests", 429);
    }

    // Authenticate request (API key first, then session)
    let userId: string;

    // Development bypass when BYPASS_TOOL_AUTH is set
    if (process.env.BYPASS_TOOL_AUTH === 'true' && config.env.isDevelopment) {
      logger.info('[DEV] Bypassing authentication for claim evaluation run');
      // Use a test/dev user ID - in production this would come from auth
      // Try to get the first user, or fall back to a specific dev user
      const devUser = await prisma.user.findFirst({ select: { id: true } });
      userId = devUser?.id || 'dev-bypass-user';
    } else {
      const authenticatedUserId = await authenticateRequest(request);
      if (!authenticatedUserId) {
        return errorResponse("User must be logged in to run claim evaluations", 401);
      }
      userId = authenticatedUserId;
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
      },
      {
        userId,
        logger: aiLogger,
      }
    ) as ClaimEvaluatorOutput;

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
      },
    });

    logger.info(`Saved claim evaluation ${evaluation.id}`);

    return successResponse({
      id: evaluation.id,
      result,
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
