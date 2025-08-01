import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { z } from "zod";

import { prisma } from "@roast/db";
import { authenticateRequest } from "@/lib/auth-helpers";
import { commonErrors } from "@/lib/api-response-helpers";
import { withSecurity } from "@/lib/security-middleware";

const rerunEvaluationSchema = z.object({
  fromVersion: z.number().optional(), // Re-run from specific version
});

export const POST = withSecurity(
  async (req: NextRequest, context: { params: Promise<{ docId: string; agentId: string }> }) => {
    const params = await context.params;
    const { docId, agentId } = params;
    const userId = (await authenticateRequest(req))!;
    const body = (req as any).validatedBody || {};
    const { fromVersion } = body;

    try {

    // Verify agent exists first
    const agent = await prisma.agent.findUnique({
      where: { id: agentId }
    });

    if (!agent) {
      return commonErrors.notFound(`Agent '${agentId}' not found`);
    }

    // Find the evaluation
    const evaluation = await prisma.evaluation.findFirst({
      where: { documentId: docId, agentId },
      include: {
        document: {
          select: {
            submittedById: true,
          }
        },
        versions: {
          orderBy: { version: "desc" },
          take: 1,
        },
      }
    });

    if (!evaluation) {
      return commonErrors.notFound(`No evaluation found for agent '${agentId}' on document '${docId}'`);
    }

    // Ownership check is now handled by withSecurity middleware

    // Check if there are any running jobs
    const runningJobs = await prisma.job.findMany({
      where: {
        evaluationId: evaluation.id,
        status: { in: ['PENDING', 'RUNNING'] }
      }
    });

    if (runningJobs.length > 0) {
      return commonErrors.badRequest("Evaluation is already running. Please wait for it to complete.");
    }

    // Create new job for re-run
    const job = await prisma.job.create({
      data: {
        evaluationId: evaluation.id,
        status: 'PENDING',
      }
    });

    // Log the re-run action
    logger.info('Evaluation re-run initiated', {
      evaluationId: evaluation.id,
      documentId: docId,
      agentId,
      userId,
      fromVersion,
      jobId: job.id,
    });

      return NextResponse.json({
        success: true,
        evaluation: {
          id: evaluation.id,
          documentId: docId,
          agentId,
        },
        job: {
          id: job.id,
          status: job.status,
          createdAt: job.createdAt,
        },
        message: `Evaluation re-run initiated`,
        context: {
          fromVersion,
          previousVersion: evaluation.versions[0]?.version || null,
        }
      });
    } catch (error) {
      logger.error('Error re-running evaluation:', error);
      return commonErrors.serverError();
    }
  },
  {
    requireAuth: true,
    validateBody: rerunEvaluationSchema,
    checkOwnership: async (userId: string, request: NextRequest) => {
      // Extract docId from URL path - matches /api/docs/{docId}/evals/{agentId}/rerun
      const url = new URL(request.url);
      const pathMatch = url.pathname.match(/\/api\/docs\/([^\/]+)\/evals/);
      const docId = pathMatch?.[1];
      
      if (!docId) {
        return false;
      }
      
      const document = await prisma.document.findUnique({
        where: { id: docId },
        select: { submittedById: true }
      });
      return document?.submittedById === userId;
    }
  }
);