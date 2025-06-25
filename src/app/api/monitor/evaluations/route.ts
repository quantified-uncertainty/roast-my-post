import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/auth-helpers";
import { commonErrors } from "@/lib/api-response-helpers";
import { isAdmin } from "@/lib/auth";

export async function GET(request: NextRequest) {
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
    // Get the 20 most recent evaluations with their latest versions
    const recentEvaluations = await prisma.evaluation.findMany({
      take: 20,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        document: {
          select: {
            id: true,
            versions: {
              select: {
                title: true,
              },
              orderBy: {
                version: "desc",
              },
              take: 1,
            },
          },
        },
        agent: {
          select: {
            id: true,
            versions: {
              select: {
                name: true,
              },
              orderBy: {
                version: "desc",
              },
              take: 1,
            },
          },
        },
        versions: {
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
          include: {
            agentVersion: {
              select: {
                name: true,
                version: true,
              },
            },
            comments: {
              select: {
                id: true,
                title: true,
                description: true,
                importance: true,
                grade: true,
              },
            },
            job: {
              select: {
                id: true,
                costInCents: true,
                llmThinking: true,
                tasks: {
                  select: {
                    id: true,
                    name: true,
                    modelName: true,
                    priceInCents: true,
                    timeInSeconds: true,
                    log: true,
                    createdAt: true,
                    llmInteractions: true,
                  },
                },
              },
            },
          },
        },
        jobs: {
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
          select: {
            id: true,
            status: true,
            createdAt: true,
            completedAt: true,
            error: true,
            costInCents: true,
            durationInSeconds: true,
          },
        },
      },
    });

    // Transform the data to match the expected format
    const evaluations = recentEvaluations.map((evaluation) => ({
      id: evaluation.id,
      createdAt: evaluation.createdAt,
      document: evaluation.document,
      agent: evaluation.agent,
      versions: evaluation.versions.map((version) => ({
        id: version.id,
        version: version.version,
        summary: version.summary,
        analysis: version.analysis,
        grade: version.grade,
        selfCritique: version.selfCritique,
        createdAt: version.createdAt,
        agentVersion: version.agentVersion,
        comments: version.comments,
        job: version.job,
      })),
      jobs: evaluation.jobs,
    }));

    return NextResponse.json({ evaluations });
  } catch (error) {
    logger.error('Error fetching evaluations:', error);
    return commonErrors.serverError("Failed to fetch evaluations");
  }
}