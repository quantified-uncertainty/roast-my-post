import { NextRequest } from "next/server";
import { logger } from "@/infrastructure/logging/logger";
import { prisma } from "@roast/db";
import { authenticateRequest } from "@/infrastructure/auth/auth-helpers";
import { commonErrors } from "@/infrastructure/http/api-response-helpers";
import { serializeJobNumeric } from "@/infrastructure/database/prisma-serializers";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const userId = await authenticateRequest(req);
  if (!userId) {
    return commonErrors.unauthorized();
  }
  
  const { jobId } = await params;
  if (!jobId) {
    return commonErrors.badRequest("Missing jobId");
  }
  
  try {
    // First, check if the job exists and get the document owner
    const jobWithOwner = await prisma.job.findUnique({
      where: { id: jobId },
      select: {
        evaluation: {
          select: {
            document: {
              select: {
                submittedById: true,
              },
            },
          },
        },
      },
    });
    
    if (!jobWithOwner) {
      return commonErrors.notFound("Job");
    }
    
    // Check if the user owns the document associated with this job
    if (jobWithOwner.evaluation.document.submittedById !== userId) {
      return commonErrors.forbidden();
    }
    
    // Now fetch the full job data
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        status: true,
        createdAt: true,
        completedAt: true,
        error: true,
        logs: true,
        priceInDollars: true,
        durationInSeconds: true,
        attempts: true,
        originalJobId: true,
        tasks: true,
      },
    });
    
    // Serialize Decimal fields before returning
    if (!job) {
      return commonErrors.notFound("Job not found");
    }
    const serializedJob = serializeJobNumeric(job);
    return new Response(JSON.stringify(serializedJob), { status: 200 });
  } catch (error) {
    logger.error('Error fetching job:', error);
    return commonErrors.serverError("Failed to fetch job");
  }
}
