import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { z } from "zod";

import { prisma } from "@roast/db";
import { authenticateRequest } from "@/lib/auth-helpers";
import { commonErrors } from "@/lib/api-response-helpers";

const rerunEvaluationSchema = z.object({
  reason: z.string().optional(),
  fromVersion: z.number().optional(), // Re-run from specific version
});

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ docId: string; agentId: string }> }
) {
  const params = await context.params;
  const { docId, agentId } = params;

  try {
    // Authenticate request
    const userId = await authenticateRequest(req);
    if (!userId) {
      return commonErrors.unauthorized();
    }

    // Parse request body
    const body = await req.json().catch(() => ({}));
    const { reason, fromVersion } = rerunEvaluationSchema.parse(body);

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

    // Check ownership (optional - might allow any authenticated user to re-run)
    if (evaluation.document.submittedById !== userId) {
      return commonErrors.forbidden();
    }

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
      reason,
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
      message: `Evaluation re-run initiated${reason ? `: ${reason}` : ""}`,
      context: {
        reason,
        fromVersion,
        previousVersion: evaluation.versions[0]?.version || null,
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return commonErrors.badRequest("Invalid request data");
    }
    
    logger.error('Error re-running evaluation:', error);
    return commonErrors.serverError();
  }
}