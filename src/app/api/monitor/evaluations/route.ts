import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Get the 20 most recent evaluation versions with their evaluations
    const recentVersions = await prisma.evaluationVersion.findMany({
      take: 20,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        evaluation: {
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
        },
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
    });

    // Transform the data to match the expected format
    const evaluations = recentVersions.map((version) => ({
      id: version.evaluation.id,
      createdAt: version.evaluation.createdAt,
      document: version.evaluation.document,
      agent: version.evaluation.agent,
      versions: [
        {
          id: version.id,
          summary: version.summary,
          analysis: version.analysis,
          grade: version.grade,
          selfCritique: version.selfCritique,
          createdAt: version.createdAt,
          agentVersion: version.agentVersion,
          comments: version.comments,
          job: version.job,
        },
      ],
      jobs: version.evaluation.jobs,
    }));

    return NextResponse.json({ evaluations });
  } catch (error) {
    console.error("Error fetching evaluations:", error);
    return NextResponse.json(
      { error: "Failed to fetch evaluations" },
      { status: 500 }
    );
  }
}