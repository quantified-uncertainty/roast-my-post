import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { prisma } from "@roast/db";
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
        priceInDollars: true,
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
            priceInDollars: true,
            timeInSeconds: true,
            log: true,
            createdAt: true,
          },
        },
      },
    });

    return NextResponse.json({ jobs });
  } catch (error) {
    logger.error('Error fetching jobs:', error);
    return commonErrors.serverError("Failed to fetch jobs");
  }
}