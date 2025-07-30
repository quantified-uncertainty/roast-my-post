import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { successResponse, commonErrors } from "@/lib/api-response-helpers";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const resolvedParams = await params;
    const agentId = resolvedParams.agentId;
    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batchId');

    // Verify agent exists (allow public access)
    const agent = await prisma.agent.findUnique({
      where: { id: agentId }
    });
    
    if (!agent) {
      return commonErrors.notFound("Agent");
    }

    // Build where clause for jobs
    const whereClause: Prisma.JobWhereInput = {
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
        priceInDollars: true,
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
      costInCents: job.priceInDollars ? Math.round(parseFloat(job.priceInDollars.toString()) * 100) : null,
      priceInDollars: job.priceInDollars,
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

    return successResponse({ jobs: transformedJobs });
  } catch {
    // Error is handled by returning error response
    return commonErrors.serverError("Failed to fetch jobs");
  }
}