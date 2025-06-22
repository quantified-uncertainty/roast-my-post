import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const resolvedParams = await params;
    const agentId = resolvedParams.agentId;

    // Get agent details including dates
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      select: {
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!agent) {
      return NextResponse.json(
        { error: "Agent not found" },
        { status: 404 }
      );
    }

    // Get total evaluations
    const totalEvaluations = await prisma.evaluationVersion.count({
      where: { agentId: agentId },
    });

    // Get average grade
    const gradesResult = await prisma.evaluationVersion.aggregate({
      where: {
        agentId: agentId,
        grade: { not: null },
      },
      _avg: { grade: true },
      _count: { grade: true },
    });

    // Get total cost and average cost
    const costsResult = await prisma.job.aggregate({
      where: {
        evaluation: { agentId: agentId },
        costInCents: { not: null },
      },
      _sum: { costInCents: true },
      _avg: { costInCents: true },
      _count: { costInCents: true },
    });

    // Get average time
    const timeResult = await prisma.job.aggregate({
      where: {
        evaluation: { agentId: agentId },
        durationInSeconds: { not: null },
        status: 'COMPLETED',
      },
      _avg: { durationInSeconds: true },
      _count: { durationInSeconds: true },
    });

    // Get success rate
    const jobStats = await prisma.job.groupBy({
      by: ['status'],
      where: {
        evaluation: { agentId: agentId },
      },
      _count: true,
    });

    const totalJobs = jobStats.reduce((sum, stat) => sum + stat._count, 0);
    const completedJobs = jobStats.find(stat => stat.status === 'COMPLETED')?._count || 0;
    const successRate = totalJobs > 0 ? (completedJobs / totalJobs) * 100 : 0;

    // Get unique documents count
    const uniqueDocuments = await prisma.evaluation.findMany({
      where: { agentId: agentId },
      select: { documentId: true },
      distinct: ['documentId'],
    });

    // Get active jobs (running + pending)
    const activeJobs = await prisma.job.count({
      where: {
        evaluation: { agentId: agentId },
        status: { in: ['RUNNING', 'PENDING'] },
      },
    });

    // Get recent evaluations
    const recentEvaluations = await prisma.evaluationVersion.findMany({
      where: { agentId: agentId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        evaluation: {
          include: {
            document: {
              include: {
                versions: {
                  orderBy: { version: 'desc' },
                  take: 1,
                },
              },
            },
          },
        },
        job: {
          select: {
            status: true,
          },
        },
      },
    });

    const stats = {
      totalEvaluations,
      averageGrade: gradesResult._avg.grade,
      totalCost: costsResult._sum.costInCents || 0,
      averageCost: costsResult._avg.costInCents || 0,
      averageTime: timeResult._avg.durationInSeconds || 0,
      successRate,
      uniqueDocuments: uniqueDocuments.length,
      activeJobs,
      createdAt: agent.createdAt,
      updatedAt: agent.updatedAt,
      recentEvaluations: recentEvaluations.map((evalVersion) => ({
        id: evalVersion.id,
        documentId: evalVersion.evaluation.document.id,
        documentTitle: evalVersion.evaluation.document.versions[0]?.title || 'Unknown Document',
        grade: evalVersion.grade,
        status: evalVersion.job?.status || 'UNKNOWN',
        createdAt: evalVersion.createdAt,
      })),
    };

    return NextResponse.json({ stats });
  } catch (error) {
    console.error("Error fetching agent overview:", error);
    return NextResponse.json(
      { error: "Failed to fetch overview statistics" },
      { status: 500 }
    );
  }
}