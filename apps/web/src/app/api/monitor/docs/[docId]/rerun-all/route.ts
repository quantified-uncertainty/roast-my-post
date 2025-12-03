import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/infrastructure/logging/logger";
import { EvaluationRepository } from "@roast/db";
import { authenticateRequest } from "@/infrastructure/auth/auth-helpers";
import { commonErrors } from "@/infrastructure/http/api-response-helpers";
import { isAdmin } from "@/infrastructure/auth/auth";
import { getServices } from "@/application/services/ServiceFactory";

const evaluationRepository = new EvaluationRepository();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ docId: string }> }
) {
  const userId = await authenticateRequest(request);
  if (!userId) {
    return commonErrors.unauthorized();
  }

  const adminCheck = await isAdmin();
  if (!adminCheck) {
    return commonErrors.forbidden();
  }

  try {
    const { docId } = await params;

    // Get all evaluations for this document
    const evaluations = await evaluationRepository.findByDocumentId(docId);

    if (evaluations.length === 0) {
      return NextResponse.json(
        { error: "No evaluations found for this document" },
        { status: 404 }
      );
    }

    // Create new jobs for each evaluation
    const { jobService } = getServices();
    const results = [];

    for (const evaluation of evaluations) {
      try {
        const newJob = await jobService.createJob(evaluation.id);
        results.push({
          evaluationId: evaluation.id,
          agentId: evaluation.agentId,
          agentName: evaluation.agentName,
          jobId: newJob.id,
          success: true,
        });
      } catch (error) {
        logger.error(`Failed to create job for evaluation ${evaluation.id}:`, error);
        results.push({
          evaluationId: evaluation.id,
          agentId: evaluation.agentId,
          agentName: evaluation.agentName,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    logger.info(`Document ${docId} re-run all by admin ${userId}`, {
      documentId: docId,
      adminId: userId,
      totalEvaluations: evaluations.length,
      successCount,
      failCount,
    });

    return NextResponse.json({
      success: failCount === 0,
      documentId: docId,
      totalEvaluations: evaluations.length,
      successCount,
      failCount,
      results,
    });

  } catch (error) {
    logger.error('Error re-running all evaluations:', error);
    return commonErrors.serverError("Failed to re-run evaluations");
  }
}
