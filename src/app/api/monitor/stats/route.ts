import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { JobStatus } from "@prisma/client";
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
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Run all queries in parallel for better performance
    const [
      jobStats,
      jobsToday,
      jobs24h,
      evaluationStats,
      evaluationsToday,
      documentStats,
      agentStats,
      totalComments,
      avgGrade,
      avgDuration,
      totalCostToday,
    ] = await Promise.all([
      // Job counts by status
      prisma.job.groupBy({
        by: ['status'],
        _count: {
          id: true,
        },
      }),
      
      // Jobs created today
      prisma.job.findMany({
        where: {
          createdAt: {
            gte: startOfDay,
          },
        },
        select: {
          status: true,
          costInCents: true,
        },
      }),
      
      // Jobs from last 24 hours for success rate
      prisma.job.findMany({
        where: {
          createdAt: {
            gte: twentyFourHoursAgo,
          },
          status: {
            in: [JobStatus.COMPLETED, JobStatus.FAILED],
          },
        },
        select: {
          status: true,
        },
      }),
      
      // Total evaluations
      prisma.evaluation.count(),
      
      // Evaluations created today
      prisma.evaluation.count({
        where: {
          createdAt: {
            gte: startOfDay,
          },
        },
      }),
      
      // Document counts
      prisma.$transaction([
        prisma.document.count(),
        prisma.document.count({
          where: {
            evaluations: {
              some: {},
            },
          },
        }),
      ]),
      
      // Agent counts
      prisma.$transaction([
        prisma.agent.count(),
        prisma.agent.count({
          where: {
            evaluations: {
              some: {},
            },
          },
        }),
      ]),
      
      // Total comments across all evaluations
      prisma.evaluationComment.count(),
      
      // Average grade across all evaluation versions
      prisma.evaluationVersion.aggregate({
        _avg: {
          grade: true,
        },
        where: {
          grade: {
            not: null,
          },
        },
      }),
      
      // Average duration of completed jobs
      prisma.job.aggregate({
        _avg: {
          durationInSeconds: true,
        },
        where: {
          status: JobStatus.COMPLETED,
          durationInSeconds: {
            not: null,
          },
        },
      }),
      
      // Total cost today
      prisma.job.aggregate({
        _sum: {
          costInCents: true,
        },
        where: {
          createdAt: {
            gte: startOfDay,
          },
          status: JobStatus.COMPLETED,
        },
      }),
    ]);

    // Process job statistics
    const jobCounts = {
      total: 0,
      pending: 0,
      running: 0,
      completed: 0,
      failed: 0,
    };

    jobStats.forEach((stat) => {
      jobCounts.total += stat._count.id;
      jobCounts[stat.status.toLowerCase() as keyof typeof jobCounts] = stat._count.id;
    });

    // Process today's jobs
    const jobsTodayByStatus = {
      completed: 0,
      failed: 0,
      totalCost: 0,
    };

    jobsToday.forEach((job) => {
      if (job.status === JobStatus.COMPLETED) {
        jobsTodayByStatus.completed++;
        jobsTodayByStatus.totalCost += job.costInCents || 0;
      } else if (job.status === JobStatus.FAILED) {
        jobsTodayByStatus.failed++;
      }
    });

    // Calculate success rate for last 24 hours
    const completed24h = jobs24h.filter(job => job.status === JobStatus.COMPLETED).length;
    const total24h = jobs24h.length;
    const successRate24h = total24h > 0 ? completed24h / total24h : 0;

    // Calculate average duration in minutes
    const avgDurationMinutes = avgDuration._avg.durationInSeconds 
      ? avgDuration._avg.durationInSeconds / 60 
      : 0;

    const stats = {
      jobs: {
        total: jobCounts.total,
        pending: jobCounts.pending,
        running: jobCounts.running,
        completed: jobCounts.completed,
        failed: jobCounts.failed,
        completedToday: jobsTodayByStatus.completed,
        failedToday: jobsTodayByStatus.failed,
        successRate24h,
        avgDurationMinutes,
        totalCostToday: totalCostToday._sum.costInCents || 0,
      },
      evaluations: {
        total: evaluationStats,
        today: evaluationsToday,
        avgGrade: avgGrade._avg.grade || 0,
        totalComments,
      },
      documents: {
        total: documentStats[0],
        withEvaluations: documentStats[1],
      },
      agents: {
        total: agentStats[0],
        active: agentStats[1],
      },
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Error fetching system stats:", error);
    return commonErrors.serverError("Failed to fetch system stats");
  }
}