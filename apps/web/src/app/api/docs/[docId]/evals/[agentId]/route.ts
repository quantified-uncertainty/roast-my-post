import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/infrastructure/logging/logger";
import { z } from "zod";

import { prisma } from "@roast/db";
import { commonErrors } from "@/infrastructure/http/api-response-helpers";
import { getEvaluationForDisplay, extractEvaluationDisplayData } from "@/application/workflows/evaluation/evaluationQueries";
import { withSecurity } from "@/infrastructure/http/security-middleware";
import { authenticateRequest } from "@/infrastructure/auth/auth-helpers";
import { validateLlmAccess } from "@/infrastructure/http/guards";
import { chargeQuota } from "@/infrastructure/http/rate-limit-handler";
import { PrivacyService } from "@/infrastructure/auth/privacy-service";
import { getServices } from "@/application/services/ServiceFactory";

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

    // Get evaluation data using existing query logic (pass undefined for API calls)
    const result = await getEvaluationForDisplay(docId, agentId, undefined);

    if (!result.evaluation) {
      return commonErrors.notFound(`No evaluation found for agent '${agentId}' on document '${docId}'`);
    }

    // Extract display data
    const evaluationData = extractEvaluationDisplayData(result);
    const { evaluation } = result;

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
  async (
    req: NextRequest,
    context: { params: Promise<{ docId: string; agentId: string }> },
  ) => {
    const params = await context.params;
    const { docId, agentId } = params;
    const userId = (await authenticateRequest(req))!;
    // Authentication is handled by withSecurity middleware
    // userId is injected by withSecurity and used for rate limiting

    try {
      // 1. Validate access (system pause + quota)
      const accessError = await validateLlmAccess({ userId, requestedCount: 1 });
      if (accessError) return accessError;

      // 2. Create or get existing evaluation (with proper transaction handling)
      // EvaluationService handles document/agent verification internally
      const { evaluationService } = getServices();
      const result = await evaluationService.createEvaluation({
        documentId: docId,
        agentId,
        userId
      });

      if (result.isError()) {
        const error = result.error();
        if (error?.code === 'NOT_FOUND') {
          return commonErrors.notFound(error.message);
        }
        logger.error('Error creating evaluation:', error);
        return commonErrors.serverError();
      }

      const evaluationResult = result.unwrap();

      // 3. Charge quota after successful creation
      await chargeQuota({ userId, chargeCount: 1, context: { docId, agentId } });

      return NextResponse.json({
        success: true,
        evaluation: {
          id: evaluationResult.evaluationId,
          documentId: docId,
          agentId,
          created: evaluationResult.created,
        },
        job: {
          id: evaluationResult.jobId,
          status: 'PENDING',
        },
        message: evaluationResult.created
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

