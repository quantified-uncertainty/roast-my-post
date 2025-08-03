import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { prisma } from "@roast/db";
import { authenticateRequest } from "@/lib/auth-helpers";
import { commonErrors } from "@/lib/api-response-helpers";
import { isAdmin } from "@/lib/auth";
import { serializeJobNumeric } from "@/lib/prisma-serializers";

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
      select: {
        id: true,
        createdAt: true,
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
          select: {
            id: true,
            version: true,
            summary: true,
            analysis: true,
            grade: true,
            selfCritique: true,
            createdAt: true,
            agentVersion: {
              select: {
                name: true,
                version: true,
              },
            },
            comments: {
              select: {
                id: true,
                description: true,
                importance: true,
                grade: true,
              },
            },
            job: {
              select: {
                id: true,
                priceInDollars: true,
                llmThinking: true,
                tasks: {
                  select: {
                    id: true,
                    name: true,
                    modelName: true,
                    priceInDollars: true,
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
            priceInDollars: true,
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
        job: version.job ? serializeJobNumeric(version.job) : null,
      })),
      jobs: evaluation.jobs.map(serializeJobNumeric),
    }));

    return NextResponse.json({ evaluations });
  } catch (error) {
    logger.error('Error fetching evaluations:', error);
    return commonErrors.serverError("Failed to fetch evaluations");
  }
}