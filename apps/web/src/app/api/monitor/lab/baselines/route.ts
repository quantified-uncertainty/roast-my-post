import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/infrastructure/logging/logger";
import { authenticateRequest } from "@/infrastructure/auth/auth-helpers";
import { commonErrors } from "@/infrastructure/http/api-response-helpers";
import { isAdmin } from "@/infrastructure/auth/auth";
import { metaEvaluationRepository, prisma } from "@roast/db";

export async function GET(request: NextRequest) {
  const userId = await authenticateRequest(request);
  if (!userId) return commonErrors.unauthorized();

  const adminCheck = await isAdmin();
  if (!adminCheck) return commonErrors.forbidden();

  const agentId = request.nextUrl.searchParams.get("agentId");
  if (!agentId) {
    return NextResponse.json({ error: "agentId is required" }, { status: 400 });
  }

  try {
    const baselines = await metaEvaluationRepository.getValidationBaselines(agentId);
    return NextResponse.json({ baselines });
  } catch (error) {
    logger.error("Error fetching baselines:", error);
    return commonErrors.serverError("Failed to fetch baselines");
  }
}

export async function POST(request: NextRequest) {
  const userId = await authenticateRequest(request);
  if (!userId) return commonErrors.unauthorized();

  const adminCheck = await isAdmin();
  if (!adminCheck) return commonErrors.forbidden();

  try {
    const body = await request.json();
    const { name, description, agentId, documentIds, evaluationVersionIds, beforeDate } = body;

    if (!name || !agentId) {
      return NextResponse.json(
        { error: "name and agentId are required" },
        { status: 400 }
      );
    }

    // Get evaluation version IDs from document IDs if not provided directly
    let evalVersionIds = evaluationVersionIds;
    if (!evalVersionIds?.length && documentIds?.length) {
      // Get the latest evaluation version for each document (optionally before cutoff date)
      const evaluations = await prisma.evaluationVersion.findMany({
        where: {
          agentId,
          evaluation: {
            documentId: { in: documentIds },
          },
          ...(beforeDate ? { createdAt: { lt: new Date(beforeDate) } } : {}),
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          evaluation: { select: { documentId: true } },
        },
      });

      // Keep only the latest version per document (before cutoff if specified)
      const latestByDoc = new Map<string, string>();
      for (const ev of evaluations) {
        if (!latestByDoc.has(ev.evaluation.documentId)) {
          latestByDoc.set(ev.evaluation.documentId, ev.id);
        }
      }
      evalVersionIds = Array.from(latestByDoc.values());
    }

    if (!evalVersionIds?.length) {
      return NextResponse.json(
        { error: "No evaluation versions found for the selected documents" },
        { status: 400 }
      );
    }

    const baseline = await metaEvaluationRepository.createValidationBaseline({
      name,
      description,
      agentId,
      evaluationVersionIds: evalVersionIds,
      createdById: userId,
    });

    return NextResponse.json({ baseline });
  } catch (error) {
    logger.error("Error creating baseline:", error);
    return commonErrors.serverError("Failed to create baseline");
  }
}
