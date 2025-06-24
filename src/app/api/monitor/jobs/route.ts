import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/auth-helpers";
import { commonErrors } from "@/lib/api-response-helpers";

export async function GET(request: NextRequest) {
  const userId = await authenticateRequest(request);
  if (!userId) {
    return commonErrors.unauthorized();
  }
  
  try {
    const jobs = await prisma.job.findMany({
      take: 20,
      orderBy: {
        createdAt: "desc",
      },
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
          },
        },
        tasks: {
          select: {
            id: true,
            name: true,
            modelName: true,
            priceInCents: true,
            timeInSeconds: true,
            log: true,
            createdAt: true,
          },
        },
      },
    });

    return NextResponse.json({ jobs });
  } catch (error) {
    console.error("Error fetching jobs:", error);
    return commonErrors.serverError("Failed to fetch jobs");
  }
}