import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/infrastructure/logging/logger";
import { prisma } from "@roast/db";
import { JobStatus } from "@roast/db";
import { authenticateRequest } from "@/infrastructure/auth/auth-helpers";
import { commonErrors } from "@/infrastructure/http/api-response-helpers";
import { isAdmin } from "@/infrastructure/auth/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const userId = await authenticateRequest(request);
  if (!userId) {
    return commonErrors.unauthorized();
  }
  
  // Check if user is admin
  const adminCheck = await isAdmin();
  if (!adminCheck) {
    return commonErrors.forbidden();
  }
  
  try {
    const { jobId } = await params;
    
    // Parse request body for optional cancellation reason
    let cancellationReason: string | undefined;
    try {
      const body = await request.json();
      cancellationReason = body.reason;
    } catch {
      // No body or invalid JSON is fine, reason is optional
    }
    
    // Get the current job status
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      select: { status: true }
    });
    
    if (!job) {
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404 }
      );
    }
    
    // Only allow cancelling PENDING or RUNNING jobs
    if (job.status !== JobStatus.PENDING && job.status !== JobStatus.RUNNING) {
      return NextResponse.json(
        { error: `Cannot cancel job with status ${job.status}. Only PENDING or RUNNING jobs can be cancelled.` },
        { status: 400 }
      );
    }
    
    // Update the job with cancellation info
    const updatedJob = await prisma.job.update({
      where: { id: jobId },
      data: {
        status: JobStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelledById: userId,
        cancellationReason,
        completedAt: new Date(), // Set completion time for cancelled jobs
      },
      include: {
        cancelledBy: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    });
    
    logger.info(`Job ${jobId} cancelled by admin ${userId}`, {
      jobId,
      adminId: userId,
      reason: cancellationReason || "No reason provided"
    });
    
    return NextResponse.json({
      success: true,
      job: {
        id: updatedJob.id,
        status: updatedJob.status,
        cancelledAt: updatedJob.cancelledAt,
        cancelledBy: updatedJob.cancelledBy,
        cancellationReason: updatedJob.cancellationReason,
      }
    });
    
  } catch (error) {
    logger.error('Error cancelling job:', error);
    return commonErrors.serverError("Failed to cancel job");
  }
}