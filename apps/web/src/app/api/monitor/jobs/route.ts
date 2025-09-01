import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/infrastructure/logging/logger";
import { prisma } from "@roast/db";
import { authenticateRequest } from "@/infrastructure/auth/auth-helpers";
import { commonErrors } from "@/infrastructure/http/api-response-helpers";
import { isAdmin } from "@/infrastructure/auth/auth";
import { serializeJobsNumeric } from "@/infrastructure/database/prisma-serializers";

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
    // Get status filter from query params
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    
    const whereClause = status && status !== 'ALL' 
      ? { status: status as any }
      : {};
    
    const jobs = await prisma.job.findMany({
      where: whereClause,
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
                submittedBy: {
                  select: {
                    name: true,
                    email: true,
                  },
                },
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

    // Get job counts by status
    const counts = await prisma.job.groupBy({
      by: ['status'],
      _count: true,
    });
    
    const statusCounts = counts.reduce((acc, curr) => {
      acc[curr.status] = curr._count;
      return acc;
    }, {} as Record<string, number>);

    // Convert Decimal fields to numbers for client compatibility
    const serializedJobs = serializeJobsNumeric(jobs);

    return NextResponse.json({ 
      jobs: serializedJobs,
      statusCounts 
    });
  } catch (error) {
    logger.error('Error fetching jobs:', error);
    return commonErrors.serverError("Failed to fetch jobs");
  }
}