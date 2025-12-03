import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/infrastructure/logging/logger";
import { JobRepository } from "@roast/db";
import { authenticateRequest } from "@/infrastructure/auth/auth-helpers";
import { commonErrors } from "@/infrastructure/http/api-response-helpers";
import { isAdmin } from "@/infrastructure/auth/auth";
import { getServices } from "@/application/services/ServiceFactory";

const jobRepository = new JobRepository();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
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
    const { jobId } = await params;

    // Get the job to find its evaluationId
    const job = await jobRepository.findById(jobId);
    if (!job) {
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404 }
      );
    }

    // Create a new job for the same evaluation
    const { jobService } = getServices();
    const newJob = await jobService.createJob(job.evaluationId);

    logger.info(`Job ${jobId} re-run by admin ${userId}, new job: ${newJob.id}`, {
      originalJobId: jobId,
      newJobId: newJob.id,
      evaluationId: job.evaluationId,
      adminId: userId,
    });

    return NextResponse.json({
      success: true,
      originalJobId: jobId,
      newJob: {
        id: newJob.id,
        status: newJob.status,
        createdAt: newJob.createdAt,
      },
    });

  } catch (error) {
    logger.error('Error re-running job:', error);
    return commonErrors.serverError("Failed to re-run job");
  }
}
