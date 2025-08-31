import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/infrastructure/logging/logger";
import { z } from "zod";

import { prisma } from "@roast/db";
import { commonErrors } from "@/infrastructure/http/api-response-helpers";
import { getEvaluationForDisplay, extractEvaluationDisplayData } from "@/application/workflows/evaluation/evaluationQueries";
import { withSecurity } from "@/infrastructure/http/security-middleware";
import { PrivacyService } from "@/infrastructure/auth/privacy-service";

const createEvaluationSchema = z.object({
  // Currently no body parameters needed
});

// GET endpoint respects document privacy
export async function GET(
  req: NextRequest, 
  context: { params: Promise<{ docId: string; agentId: string }> }
) {
  const params = await context.params;
  const { docId, agentId } = params;

  try {
    // Verify document access (handles privacy check)
    const accessResult = await PrivacyService.verifyApiAccess(req, docId);
    if (accessResult.denied) {
      return accessResult.response;
    }

    // Get evaluation data using existing query logic
    const evaluation = await getEvaluationForDisplay(docId, agentId);

    if (!evaluation) {
      return commonErrors.notFound(`No evaluation found for agent '${agentId}' on document '${docId}'`);
    }

    // Extract display data
    const evaluationData = extractEvaluationDisplayData(evaluation);

    return NextResponse.json({
      evaluation: {
        id: evaluation.id,
        documentId: docId,
        agentId,
        agentName: evaluation.agent.versions[0]?.name || "Unknown Agent",
        currentVersion: {
          version: evaluationData.version,
          grade: evaluationData.grade,
          summary: evaluationData.summary,
          analysis: evaluationData.analysis,
          selfCritique: evaluationData.selfCritique,
          comments: evaluationData.comments,
          job: {
            status: evaluation.versions[0]?.job?.status || "NO_JOB",
            priceInDollars: evaluation.versions[0]?.job?.priceInDollars || null,
            durationInSeconds: evaluation.versions[0]?.job?.durationInSeconds || null,
            tasks: [],
          },
          createdAt: evaluationData.createdAt,
        },
        isStale: evaluationData.isStale,
        totalVersions: evaluation.versions.length,
        document: {
          title: evaluation.document.versions[0]?.title || "Untitled",
          id: docId,
        },
      }
    });
  } catch (error) {
    logger.error('Error fetching evaluation:', error);
    return commonErrors.serverError();
  }
}

export const POST = withSecurity(
  async (req: NextRequest, context: { params: Promise<{ docId: string; agentId: string }> }) => {
    const params = await context.params;
    const { docId, agentId } = params;
    // Authentication is handled by withSecurity middleware
    // userId and body are available but not needed for this endpoint

    try {

    // Verify document exists
    const document = await prisma.document.findUnique({
      where: { id: docId },
    });

    if (!document) {
      return commonErrors.notFound("Document not found");
    }

    // Verify agent exists
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
    });

    if (!agent) {
      return commonErrors.notFound("Agent not found");
    }

    // Create or get existing evaluation
    const result = await prisma.$transaction(async (tx) => {
      const { getServices } = await import("@/application/services/ServiceFactory");
      const transactionalServices = getServices().createTransactionalServices(tx);
      
      // Check if evaluation already exists
      const existing = await tx.evaluation.findFirst({
        where: { documentId: docId, agentId }
      });
      
      if (existing) {
        // Create new job for re-evaluation using JobService
        const job = await transactionalServices.jobService.createJob(existing.id);
        
        return { evaluation: existing, job, created: false };
      }
      
      // Create new evaluation
      const evaluation = await tx.evaluation.create({
        data: {
          documentId: docId,
          agentId,
        }
      });
      
      // Create job using JobService
      const job = await transactionalServices.jobService.createJob(evaluation.id);
      
      return { evaluation, job, created: true };
    });

      return NextResponse.json({
        success: true,
        evaluation: {
          id: result.evaluation.id,
          documentId: docId,
          agentId,
          created: result.created,
        },
        job: {
          id: result.job.id,
          status: result.job.status,
        },
        message: result.created 
          ? "Evaluation created successfully"
          : "Evaluation re-run initiated",
      });
    } catch (error) {
      logger.error('Error creating evaluation:', error);
      return commonErrors.serverError();
    }
  },
  {
    requireAuth: true,
    validateBody: createEvaluationSchema,
    checkOwnership: async (userId: string, request: NextRequest) => {
      // Extract docId from URL path - matches /api/docs/{docId}/evals/{agentId}
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

