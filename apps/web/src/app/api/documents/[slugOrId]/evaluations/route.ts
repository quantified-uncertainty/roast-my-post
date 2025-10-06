import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { authenticateRequest } from "@/infrastructure/auth/auth-helpers";
import { logger } from "@/infrastructure/logging/logger";
import { prisma } from "@roast/db";

// Schema for querying evaluations
const queryEvaluationsSchema = z.object({
  status: z.enum(["pending", "completed", "failed"]).optional(),
  agentId: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

async function createEvaluation(documentId: string, agentId: string) {
  return await prisma.$transaction(async (tx) => {
    const { getServices } = await import(
      "@/application/services/ServiceFactory"
    );
    const transactionalServices = getServices().createTransactionalServices(tx);

    // Check if evaluation already exists
    const existing = await tx.evaluation.findFirst({
      where: { documentId, agentId },
    });

    if (existing) {
      // Create new job for re-evaluation using JobService
      const job = await transactionalServices.jobService.createJob(existing.id);

      return { evaluation: existing, job, created: false };
    }

    // Create new evaluation
    const evaluation = await tx.evaluation.create({
      data: {
        documentId,
        agentId,
      },
    });

    // Create job using JobService
    const job = await transactionalServices.jobService.createJob(evaluation.id);

    return { evaluation, job, created: true };
  });
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

      // Check if user can modify this document (must be owner)
      if (document.submittedById !== userId) {
        return NextResponse.json(
          { error: "Document not found" },
          { status: 404 }
        );
      }

      // Verify all agents exist
      const agents = await prisma.agent.findMany({
        where: { id: { in: agentIds } },
        select: { id: true },
      });

      const foundAgentIds = new Set(agents.map((a) => a.id));
      const missingAgentIds = agentIds.filter(
        (id: string) => !foundAgentIds.has(id)
      );

      if (missingAgentIds.length > 0) {
        return NextResponse.json(
          { error: `Evaluators not found: ${missingAgentIds.join(", ")}` },
          { status: 400 }
        );
      }

      // Create evaluations for all agents
      const results = [];
      for (const agentId of agentIds) {
        try {
          const result = await createEvaluation(documentId, agentId);
          results.push({
            agentId,
            evaluationId: result.evaluation.id,
            jobId: result.job.id,
            status: result.job.status.toLowerCase(),
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

      // Check if user can modify this document (must be owner)
      if (document.submittedById !== userId) {
        return NextResponse.json(
          { error: "Document not found" },
          { status: 404 }
        );
      }

      // Verify agent exists
      const agent = await prisma.agent.findUnique({
        where: { id: agentId },
      });

      if (!agent) {
        return NextResponse.json(
          { error: "Evaluator not found" },
          { status: 404 }
        );
      }

      // Create evaluation
      try {
        const result = await createEvaluation(documentId, agentId);

        return NextResponse.json({
          evaluationId: result.evaluation.id,
          jobId: result.job.id,
          status: result.job.status.toLowerCase(),
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
