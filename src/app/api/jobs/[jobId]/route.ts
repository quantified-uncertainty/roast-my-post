import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/auth-helpers";
import { commonErrors } from "@/lib/api-response-helpers";

export async function GET(
  req: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const userId = await authenticateRequest(req);
  if (!userId) {
    return commonErrors.unauthorized();
  }
  
  const { jobId } = params;
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
        costInCents: true,
        durationInSeconds: true,
        attempts: true,
        originalJobId: true,
        tasks: true,
      },
    });
    
    return new Response(JSON.stringify(job), { status: 200 });
  } catch (error) {
    console.error("Error fetching job:", error);
    return commonErrors.serverError("Failed to fetch job");
  }
}
