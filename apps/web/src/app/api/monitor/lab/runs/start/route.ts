import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/infrastructure/logging/logger";
import { authenticateRequest } from "@/infrastructure/auth/auth-helpers";
import { commonErrors } from "@/infrastructure/http/api-response-helpers";
import { isAdmin } from "@/infrastructure/auth/auth";
import { prisma, metaEvaluationRepository } from "@roast/db";
import { getServices } from "@/application/services/ServiceFactory";

/**
 * Start a validation run:
 * 1. Create ValidationRun record
 * 2. Get documents from baseline
 * 3. Create batch jobs to re-evaluate each document
 * 4. Return run ID and job IDs for polling
 */
export async function POST(request: NextRequest) {
  const userId = await authenticateRequest(request);
  if (!userId) return commonErrors.unauthorized();

  const adminCheck = await isAdmin();
  if (!adminCheck) return commonErrors.forbidden();

  try {
    const body = await request.json();
    const { baselineId, name, profileId } = body;

    if (!baselineId) {
      return NextResponse.json({ error: "baselineId is required" }, { status: 400 });
    }

    // Get baseline info
    const baseline = await prisma.validationBaseline.findUnique({
      where: { id: baselineId },
      select: { id: true, name: true, agentId: true },
    });

    if (!baseline) {
      return NextResponse.json({ error: "Baseline not found" }, { status: 404 });
    }

    // Get document IDs from baseline
    const documentIds = await metaEvaluationRepository.getBaselineDocumentIds(baselineId);

    if (documentIds.length === 0) {
      return NextResponse.json({ error: "Baseline has no documents" }, { status: 400 });
    }

    // Create the validation run
    const run = await metaEvaluationRepository.createValidationRun({
      baselineId,
      name: name || `Run ${new Date().toLocaleString()}`,
      profileId: profileId || undefined,
    });

    // Create batch for the jobs
    const batch = await prisma.agentEvalBatch.create({
      data: {
        name: `Validation run ${run.id.slice(0, 8)}`,
        agentId: baseline.agentId,
        requestedDocumentIds: documentIds,
        userId,
      },
    });

    // Create evaluations and jobs for each document
    const jobIds: string[] = [];
    const { jobService } = getServices();

    for (const documentId of documentIds) {
      // Check if evaluation exists
      let evaluation = await prisma.evaluation.findFirst({
        where: {
          documentId,
          agentId: baseline.agentId,
        },
      });

      // Create evaluation if it doesn't exist
      if (!evaluation) {
        evaluation = await prisma.evaluation.create({
          data: {
            documentId,
            agentId: baseline.agentId,
          },
        });
      }

      // Create job with profile ID for plugin configuration
      const job = await jobService.createJob(evaluation.id, batch.id, profileId);
      jobIds.push(job.id);
    }

    logger.info("Validation run started", {
      runId: run.id,
      baselineId,
      profileId: profileId || null,
      documentCount: documentIds.length,
      jobCount: jobIds.length,
    });

    return NextResponse.json({
      run: {
        id: run.id,
        status: "running",
      },
      batch: {
        id: batch.id,
      },
      jobIds,
      documentCount: documentIds.length,
    });
  } catch (error) {
    logger.error("Error starting validation run:", error);
    return commonErrors.serverError("Failed to start validation run");
  }
}
