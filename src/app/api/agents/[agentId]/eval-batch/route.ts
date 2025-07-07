import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { authenticateRequestSessionFirst } from "@/lib/auth-helpers";

interface CreateBatchRequest {
  name?: string;
  targetCount?: number;
  documentIds?: string[];
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    // Authenticate request (session first for this route)
    const userId = await authenticateRequestSessionFirst(request);
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const agentId = resolvedParams.agentId;
    const body: CreateBatchRequest = await request.json();

    // Validate request - mutual exclusivity
    if (body.documentIds && body.targetCount) {
      return NextResponse.json(
        { error: "Cannot specify both documentIds and targetCount" },
        { status: 400 }
      );
    }

    if (!body.documentIds && !body.targetCount) {
      return NextResponse.json(
        { error: "Must specify either documentIds or targetCount" },
        { status: 400 }
      );
    }

    // Validate targetCount if provided
    if (body.targetCount && (body.targetCount < 1 || body.targetCount > 100)) {
      return NextResponse.json(
        { error: "Target count must be between 1 and 100" },
        { status: 400 }
      );
    }

    // Validate documentIds if provided
    if (body.documentIds && body.documentIds.length === 0) {
      return NextResponse.json(
        { error: "Document IDs array cannot be empty" },
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

    if (agent.submittedById !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let documentsToProcess: { id: string; evaluations: { id: string }[] }[] = [];
    let requestedDocumentIds: string[] = [];

    if (body.documentIds) {
      // Specific document mode - validate that documents exist
      const docs = await prisma.document.findMany({
        where: { id: { in: body.documentIds } },
        select: { id: true },
      });

      const foundIds = new Set(docs.map((d) => d.id));
      const missing = body.documentIds.filter((id) => !foundIds.has(id));

      if (missing.length > 0) {
        return NextResponse.json(
          { error: `Documents not found: ${missing.join(", ")}` },
          { status: 400 }
        );
      }

      // Check if these documents have evaluations for this agent
      documentsToProcess = await prisma.document.findMany({
        where: {
          id: { in: body.documentIds },
          evaluations: {
            some: {
              agentId: agentId,
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

      if (documentsToProcess.length !== body.documentIds.length) {
        const docsWithoutEvals = body.documentIds.filter(
          id => !documentsToProcess.some(d => d.id === id)
        );
        return NextResponse.json(
          { error: `Some documents don't have evaluations for this agent: ${docsWithoutEvals.join(", ")}` },
          { status: 400 }
        );
      }

      requestedDocumentIds = body.documentIds;
    } else {
      // Random selection mode - find documents that have been evaluated by this agent
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

      documentsToProcess = documentsWithEvaluations;
    }

    // Calculate targetCount based on mode
    const targetCount = body.documentIds ? body.documentIds.length : body.targetCount!;

    // Create the batch
    const batch = await prisma.agentEvalBatch.create({
      data: {
        name: body.name,
        agentId: agentId,
        targetCount: targetCount,
        requestedDocumentIds: requestedDocumentIds,
      },
    });

    // Create jobs based on mode
    const jobsToCreate = [];
    
    if (body.documentIds) {
      // Specific document mode - create one job per document
      for (const document of documentsToProcess) {
        const evaluationId = document.evaluations[0].id;
        jobsToCreate.push({
          evaluationId: evaluationId,
          agentEvalBatchId: batch.id,
        });
      }
    } else {
      // Random selection mode
      const shuffledDocuments = documentsToProcess.sort(() => 0.5 - Math.random());
      const documentsToUse = shuffledDocuments.slice(0, Math.min(body.targetCount!, documentsToProcess.length));
      
      // If we need more jobs than unique documents, we'll repeat documents
      for (let i = 0; i < body.targetCount!; i++) {
        const documentIndex = i % documentsToUse.length;
        const document = documentsToUse[documentIndex];
        const evaluationId = document.evaluations[0].id;
        
        jobsToCreate.push({
          evaluationId: evaluationId,
          agentEvalBatchId: batch.id,
        });
      }
    }

    // Create all jobs
    await prisma.job.createMany({
      data: jobsToCreate,
    });

    // Return the created batch with job count
    const batchWithJobCount = await prisma.agentEvalBatch.findUnique({
      where: { id: batch.id },
      include: {
        _count: {
          select: {
            jobs: true,
          },
        },
      },
    });

    // Get job details separately
    const jobs = await prisma.job.findMany({
      where: { agentEvalBatchId: batch.id },
      select: {
        id: true,
        status: true,
        evaluation: {
          select: {
            document: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    });

    const documentIds = jobs.map(job => job.evaluation.document.id);
    const uniqueDocumentIds = [...new Set(documentIds)];

    return NextResponse.json({
      batch: {
        id: batchWithJobCount?.id,
        name: batchWithJobCount?.name,
        agentId: batchWithJobCount?.agentId,
        createdAt: batchWithJobCount?.createdAt,
        targetCount: batchWithJobCount?.targetCount,
        documentIds: uniqueDocumentIds,
        jobCount: batchWithJobCount?._count.jobs || 0,
      },
      jobs: jobs.map(job => ({
        id: job.id,
        documentId: job.evaluation.document.id,
        status: job.status,
      })),
    });
  } catch (error) {
    logger.error('Error creating agent eval batch:', error);
    return NextResponse.json(
      { error: "Failed to create eval batch" },
      { status: 500 }
    );
  }
}