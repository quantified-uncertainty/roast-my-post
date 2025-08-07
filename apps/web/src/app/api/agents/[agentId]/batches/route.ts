import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/infrastructure/logging/logger";
import { prisma, type Job } from "@roast/db";
import { authenticateRequest } from "@/infrastructure/auth/auth-helpers";
import { calculateJobStats } from "@/shared/utils/batch-utils";
import { decimalToNumber } from "@/infrastructure/database/prisma-serializers";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const userId = await authenticateRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const agentId = resolvedParams.agentId;

    // Check if agent exists and user has access
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      include: {
        submittedBy: true,
      },
    });

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    if (agent.submittedById !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch recent batches with job statistics
    const batches = await prisma.agentEvalBatch.findMany({
      where: { agentId: agentId },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        jobs: {
          select: {
            id: true,
            status: true,
            priceInDollars: true,
            durationInSeconds: true,
            evaluationVersion: {
              select: {
                grade: true,
              },
            },
          },
        },
      },
    });

    // Calculate statistics for each batch
    const batchesWithStats = batches.map((batch) => {
      const jobs = batch.jobs;
      const jobStats = calculateJobStats(jobs);
      const completedJobs = jobs.filter(job => job.status === "COMPLETED");
      
      const totalCost = jobs.reduce((sum: number, job) => {
        const price = decimalToNumber(job.priceInDollars);
        if (price) {
          return sum + (price * 100);
        }
        return sum;
      }, 0);
      const avgDuration = completedJobs.length > 0 
        ? completedJobs.reduce((sum, job) => sum + (job.durationInSeconds || 0), 0) / completedJobs.length 
        : 0;

      const gradesWithValues = completedJobs
        .map(job => job.evaluationVersion?.grade)
        .filter((grade): grade is number => grade !== null && grade !== undefined);
      
      const avgGrade = gradesWithValues.length > 0 
        ? gradesWithValues.reduce((sum, grade) => sum + grade, 0) / gradesWithValues.length 
        : null;

      const progress = batch.targetCount ? (jobStats.completed / batch.targetCount) * 100 : 0;

      return {
        id: batch.id,
        name: batch.name,
        targetCount: batch.targetCount,
        createdAt: batch.createdAt,
        progress: Math.round(progress),
        completedCount: jobStats.completed,
        runningCount: jobStats.running,
        failedCount: jobStats.failed,
        pendingCount: jobStats.pending,
        totalCost,
        avgDuration: Math.round(avgDuration),
        avgGrade,
        isComplete: batch.targetCount ? completedJobs.length === batch.targetCount : false,
      };
    });

    return NextResponse.json({ batches: batchesWithStats });
  } catch (error) {
    logger.error('Error fetching agent batches:', error);
    return NextResponse.json(
      { error: "Failed to fetch batches" },
      { status: 500 }
    );
  }
}