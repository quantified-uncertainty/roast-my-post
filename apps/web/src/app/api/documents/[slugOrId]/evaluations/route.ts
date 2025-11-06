import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { authenticateRequest } from "@/infrastructure/auth/auth-helpers";
import { logger } from "@/infrastructure/logging/logger";
import { checkQuotaAvailable, chargeQuota } from "@/infrastructure/http/rate-limit-handler";
import { prisma } from "@roast/db";

// Schema for querying evaluations
const queryEvaluationsSchema = z.object({
  status: z.enum(["pending", "completed", "failed"]).optional(),
  agentId: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});



async function verifyDocumentOwnership(documentId: string, userId: string) {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
  });

  if (!document) {
    return NextResponse.json(
      { error: "Document not found" },
      { status: 404 }
    );
  }

  if (document.submittedById !== userId) {
    return NextResponse.json(
      { error: "Document not found" },
      { status: 404 }
    );
  }

  return null;
}

async function verifyAgents(agentIds: string[]) {
  const agents = await prisma.agent.findMany({
    where: { id: { in: agentIds } },
    select: { id: true },
  });

  const foundAgentIds = new Set(agents.map((a) => a.id));
  const missingAgentIds = agentIds.filter((id: string) => !foundAgentIds.has(id));

  if (missingAgentIds.length > 0) {
    return NextResponse.json(
      { error: `Evaluator${missingAgentIds.length > 1 ? 's' : ''} not found: ${missingAgentIds.join(", ")}` },
      { status: 404 }
    );
  }

  return null;
}

async function createEvaluation(documentId: string, agentId: string, userId: string) {
  // Use EvaluationService for proper transaction handling
  // This ensures evaluation + job are created atomically within a single transaction
  const { getServices } = await import(
    "@/application/services/ServiceFactory"
  );
  const { evaluationService } = getServices();

  const result = await evaluationService.createEvaluation({
    documentId,
    agentId,
    userId
  });

  if (result.isError()) {
    throw new Error(result.error()?.message || 'Failed to create evaluation');
  }

  const evaluationResult = result.unwrap();

  return {
    evaluationId: evaluationResult.evaluationId,
    jobId: evaluationResult.jobId,
    created: evaluationResult.created
  };
}

// GET /api/documents/{documentId}/evaluations
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slugOrId: string }> }
) {
  try {
    // Authenticate request
    const userId = await authenticateRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const { slugOrId: documentId } = resolvedParams;
    const url = new URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams);

    const { status, agentId, limit, offset } =
      queryEvaluationsSchema.parse(queryParams);

    // Verify document exists and user has access
    const { PrivacyService } = await import(
      "@/infrastructure/auth/privacy-service"
    );
    const document = await prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // Check if user can view this document
    const canView = await PrivacyService.canViewDocument(documentId, userId);
    if (!canView) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // Build where clause
    interface EvaluationWhereClause {
      documentId: string;
      agentId?: string;
    }

    const where: EvaluationWhereClause = { documentId };
    if (agentId) where.agentId = agentId;

    // Get evaluations with latest versions and job status
    const evaluations = await prisma.evaluation.findMany({
      where,
      include: {
        agent: {
          include: {
            versions: {
              orderBy: { createdAt: "desc" },
              take: 1,
              select: {
                name: true,
                description: true,
              },
            },
          },
        },
        versions: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            summary: true,
            analysis: true,
            grade: true,
            createdAt: true,
          },
        },
        jobs: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            status: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: limit,
    });

    // Get total count
    const total = await prisma.evaluation.count({ where });

    // Filter by status if provided
    let filteredEvaluations = evaluations;
    if (status) {
      filteredEvaluations = evaluations.filter((evaluation) => {
        const latestJob = evaluation.jobs[0];
        if (!latestJob) return status === "pending";

        switch (status) {
          case "pending":
            return (
              latestJob.status === "PENDING" || latestJob.status === "RUNNING"
            );
          case "completed":
            return latestJob.status === "COMPLETED";
          case "failed":
            return latestJob.status === "FAILED";
          default:
            return true;
        }
      });
    }

    // Format response
    const formattedEvaluations = filteredEvaluations.map((evaluation) => ({
      id: evaluation.id,
      agentId: evaluation.agentId,
      agent: {
        name: evaluation.agent.versions[0]?.name || "Unknown Evaluator",
        description: evaluation.agent.versions[0]?.description || "",
      },
      status: evaluation.jobs[0]?.status?.toLowerCase() || "pending",
      createdAt: evaluation.createdAt.toISOString(),
      latestVersion: evaluation.versions[0]
        ? {
            summary: evaluation.versions[0].summary,
            analysis: evaluation.versions[0].analysis,
            grade: evaluation.versions[0].grade,
            createdAt: evaluation.versions[0].createdAt.toISOString(),
          }
        : null,
    }));

    return NextResponse.json({
      evaluations: formattedEvaluations,
      total: status ? filteredEvaluations.length : total,
    });
  } catch (error) {
    logger.error("Error fetching evaluations:", error);
    return NextResponse.json(
      { error: "Failed to fetch evaluations" },
      { status: 500 }
    );
  }
}

// POST /api/documents/{documentId}/evaluations
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slugOrId: string }> }
) {
  try {
    // Authenticate request
    const userId = await authenticateRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const { slugOrId: documentId } = resolvedParams;

    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    // Validate request body
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Request body is required" },
        { status: 400 }
      );
    }

    // Check if this is a batch request
    const isBatch = "agentIds" in body;

    if (isBatch) {
      const { agentIds } = body;

      if (!Array.isArray(agentIds) || agentIds.length === 0) {
        return NextResponse.json(
          { error: "agentIds must be a non-empty array" },
          { status: 400 }
        );
      }

      // Verify document ownership
      const ownershipError = await verifyDocumentOwnership(documentId, userId);
      if (ownershipError) return ownershipError;

      // Verify all agents exist
      const agentError = await verifyAgents(agentIds);
      if (agentError) return agentError;

      // 1. Soft check: Do they have enough quota?
      const quotaError = await checkQuotaAvailable(userId, agentIds.length);
      if (quotaError) return quotaError;

      // 2. Create evaluations for all agents
      const results = [];
      for (const agentId of agentIds) {
        try {
          const result = await createEvaluation(documentId, agentId, userId);
          results.push({
            agentId,
            evaluationId: result.evaluationId,
            jobId: result.jobId,
            status: 'pending',
            created: result.created,
          });
        } catch {
          console.error(`Failed to create evaluation for evaluator ${agentId}`);
          results.push({
            agentId,
            error: "Failed to create evaluation",
          });
        }
      }

      // 3. Charge quota after successful creation
      await chargeQuota(userId, agentIds.length, { documentId, agentIds });

      return NextResponse.json({
        evaluations: results,
        total: results.length,
      });
    } else {
      const { agentId } = body;

      if (!agentId || typeof agentId !== "string") {
        return NextResponse.json(
          { error: "agentId is required and must be a string" },
          { status: 400 }
        );
      }

      // Verify document ownership
      const ownershipError = await verifyDocumentOwnership(documentId, userId);
      if (ownershipError) return ownershipError;

      // Verify agent exists
      const agentError = await verifyAgents([agentId]);
      if (agentError) return agentError;

      // 1. Soft check: Do they have enough quota?
      const quotaError = await checkQuotaAvailable(userId, 1);
      if (quotaError) return quotaError;

      // 2. Create evaluation
      try {
        const result = await createEvaluation(documentId, agentId, userId);

        // 3. Charge quota after successful creation
        await chargeQuota(userId, 1, { documentId, agentId });

        return NextResponse.json({
          evaluationId: result.evaluationId,
          jobId: result.jobId,
          status: 'pending',
          created: result.created,
        });
      } catch {
        logger.error("Failed to create evaluation");
        return NextResponse.json(
          { error: "Failed to create evaluation" },
          { status: 500 }
        );
      }
    }
  } catch (error) {
    logger.error("Error in POST /evaluations:", error);
    return NextResponse.json(
      { error: "An error occurred. Please try again." },
      { status: 500 }
    );
  }
}
