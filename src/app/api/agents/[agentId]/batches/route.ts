import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
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

    if (agent.submittedById !== session.user.id) {
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
            costInCents: true,
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
      const completedJobs = jobs.filter(job => job.status === "COMPLETED");
      const runningJobs = jobs.filter(job => job.status === "RUNNING");
      const failedJobs = jobs.filter(job => job.status === "FAILED");
      const pendingJobs = jobs.filter(job => job.status === "PENDING");
      
      const totalCost = jobs.reduce((sum, job) => sum + (job.costInCents || 0), 0);
      const avgDuration = completedJobs.length > 0 
        ? completedJobs.reduce((sum, job) => sum + (job.durationInSeconds || 0), 0) / completedJobs.length 
        : 0;

      const gradesWithValues = completedJobs
        .map(job => job.evaluationVersion?.grade)
        .filter((grade): grade is number => grade !== null && grade !== undefined);
      
      const avgGrade = gradesWithValues.length > 0 
        ? gradesWithValues.reduce((sum, grade) => sum + grade, 0) / gradesWithValues.length 
        : null;

      const progress = (completedJobs.length / batch.targetCount) * 100;

      return {
        id: batch.id,
        name: batch.name,
        targetCount: batch.targetCount,
        createdAt: batch.createdAt,
        progress: Math.round(progress),
        completedCount: completedJobs.length,
        runningCount: runningJobs.length,
        failedCount: failedJobs.length,
        pendingCount: pendingJobs.length,
        totalCost,
        avgDuration: Math.round(avgDuration),
        avgGrade,
        isComplete: completedJobs.length === batch.targetCount,
      };
    });

    return NextResponse.json({ batches: batchesWithStats });
  } catch (error) {
    console.error("Error fetching agent batches:", error);
    return NextResponse.json(
      { error: "Failed to fetch batches" },
      { status: 500 }
    );
  }
}