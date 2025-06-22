import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

interface CreateBatchRequest {
  name?: string;
  targetCount: number;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const agentId = resolvedParams.agentId;
    const body: CreateBatchRequest = await request.json();

    // Validate request
    if (!body.targetCount || body.targetCount < 1 || body.targetCount > 100) {
      return NextResponse.json(
        { error: "Target count must be between 1 and 100" },
        { status: 400 }
      );
    }

    // Check if agent exists and user has access
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      include: {
        submittedBy: true,
      },
    });

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    if (agent.submittedById !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Find documents that have been evaluated by this agent
    const documentsWithEvaluations = await prisma.document.findMany({
      where: {
        evaluations: {
          some: {
            agentId: agentId,
            versions: {
              some: {},
            },
          },
        },
      },
      select: {
        id: true,
        evaluations: {
          where: {
            agentId: agentId,
          },
          select: {
            id: true,
          },
        },
      },
    });

    if (documentsWithEvaluations.length === 0) {
      return NextResponse.json(
        { error: "No documents found with evaluations for this agent" },
        { status: 400 }
      );
    }

    // Create the batch
    const batch = await prisma.agentEvalBatch.create({
      data: {
        name: body.name,
        agentId: agentId,
        targetCount: body.targetCount,
      },
    });

    // Create jobs by randomly selecting documents (avoiding recent duplicates)
    const shuffledDocuments = documentsWithEvaluations.sort(() => 0.5 - Math.random());
    const documentsToUse = shuffledDocuments.slice(0, Math.min(body.targetCount, documentsWithEvaluations.length));
    
    // If we need more jobs than unique documents, we'll repeat documents
    const jobsToCreate = [];
    for (let i = 0; i < body.targetCount; i++) {
      const documentIndex = i % documentsToUse.length;
      const document = documentsToUse[documentIndex];
      const evaluationId = document.evaluations[0].id;
      
      jobsToCreate.push({
        evaluationId: evaluationId,
        agentEvalBatchId: batch.id,
      });
    }

    // Create all jobs
    await prisma.job.createMany({
      data: jobsToCreate,
    });

    // Return the created batch with job count
    const batchWithJobs = await prisma.agentEvalBatch.findUnique({
      where: { id: batch.id },
      include: {
        _count: {
          select: {
            jobs: true,
          },
        },
      },
    });

    return NextResponse.json({
      batch: batchWithJobs,
      message: `Created batch with ${jobsToCreate.length} jobs`,
    });
  } catch (error) {
    console.error("Error creating agent eval batch:", error);
    return NextResponse.json(
      { error: "Failed to create eval batch" },
      { status: 500 }
    );
  }
}