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
    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batchId');

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

    // Build where clause for jobs
    const whereClause: any = {
      evaluation: {
        agentId: agentId,
      },
    };

    // Add batch filter if specified
    if (batchId) {
      whereClause.agentEvalBatchId = batchId;
    }

    // Fetch jobs with related data
    const jobs = await prisma.job.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      take: 100, // Limit to most recent 100 jobs
      select: {
        id: true,
        status: true,
        createdAt: true,
        startedAt: true,
        completedAt: true,
        error: true,
        costInCents: true,
        durationInSeconds: true,
        attempts: true,
        originalJobId: true,
        evaluation: {
          include: {
            document: {
              include: {
                versions: {
                  orderBy: { version: "desc" },
                  take: 1,
                },
              },
            },
            agent: {
              include: {
                versions: {
                  orderBy: { version: "desc" },
                  take: 1,
                },
              },
            },
          },
        },
        evaluationVersion: {
          include: {
            comments: true,
          },
        },
        agentEvalBatch: true,
      },
    });

    // Transform jobs to match monitor page format
    const transformedJobs = jobs.map((job) => ({
      id: job.id,
      status: job.status,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
      startedAt: job.startedAt,
      error: job.error,
      costInCents: job.costInCents,
      durationInSeconds: job.durationInSeconds,
      document: {
        id: job.evaluation.document.id,
        title: job.evaluation.document.versions[0]?.title || 'Unknown Document',
      },
      agent: {
        id: job.evaluation.agent.id,
        name: job.evaluation.agent.versions[0]?.name || 'Unknown Agent',
      },
      evaluation: {
        id: job.evaluation.id,
      },
      evaluationVersion: job.evaluationVersion ? {
        id: job.evaluationVersion.id,
        grade: job.evaluationVersion.grade,
        summary: job.evaluationVersion.summary,
        commentsCount: job.evaluationVersion.comments.length,
      } : null,
      batch: job.agentEvalBatch ? {
        id: job.agentEvalBatch.id,
        name: job.agentEvalBatch.name,
      } : null,
    }));

    return NextResponse.json({ jobs: transformedJobs });
  } catch (error) {
    console.error("Error fetching agent jobs:", error);
    return NextResponse.json(
      { error: "Failed to fetch jobs" },
      { status: 500 }
    );
  }
}