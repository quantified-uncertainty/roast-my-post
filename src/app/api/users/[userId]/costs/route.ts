/**
 * User Cost Aggregation API
 * 
 * Provides cost summaries for users from completed jobs in the database
 */

import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Users can only view their own costs (unless admin)
    const { userId: requestedUserId } = await params;
    const currentUserId = session.user.id;
    
    if (requestedUserId !== currentUserId && session.user.role !== 'ADMIN') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');

    // Validate days parameter
    if (days < 1 || days > 365) {
      return Response.json(
        { error: 'Days parameter must be between 1 and 365' },
        { status: 400 }
      );
    }

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    // Get completed jobs for this user from our database
    const jobs = await prisma.job.findMany({
      where: {
        evaluation: {
          agent: {
            submittedById: requestedUserId
          }
        },
        status: 'COMPLETED',
        completedAt: {
          gte: startDate,
          lte: endDate
        }
      },
      select: {
        id: true,
        costInCents: true,
        completedAt: true,
        durationInSeconds: true
      },
      orderBy: {
        completedAt: 'desc'
      }
    });

    // Calculate totals
    const totalCostCents = jobs.reduce((sum, job) => sum + (job.costInCents || 0), 0);
    const totalCostUSD = totalCostCents / 100;
    const jobCount = jobs.length;

    // Calculate daily breakdown if requested
    const dailyBreakdown = searchParams.get('daily') === 'true' ? 
      jobs.reduce((acc, job) => {
        const date = job.completedAt!.toISOString().split('T')[0];
        if (!acc[date]) {
          acc[date] = { jobs: 0, costCents: 0 };
        }
        acc[date].jobs++;
        acc[date].costCents += job.costInCents || 0;
        return acc;
      }, {} as Record<string, { jobs: number; costCents: number }>) : 
      undefined;

    const response = {
      userId: requestedUserId,
      period: `${days} days`,
      dateRange: {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0]
      },
      totalCostUSD: Number(totalCostUSD.toFixed(4)),
      jobCount,
      ...(dailyBreakdown && {
        dailyBreakdown: Object.entries(dailyBreakdown)
          .map(([date, data]) => ({
            date,
            jobs: data.jobs,
            costUSD: Number((data.costCents / 100).toFixed(4))
          }))
          .sort((a, b) => b.date.localeCompare(a.date))
      })
    };

    return Response.json(response);
  } catch (error) {
    console.error('User costs API error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}