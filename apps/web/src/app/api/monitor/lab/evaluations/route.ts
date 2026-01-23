import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/infrastructure/logging/logger";
import { prisma, Prisma } from "@roast/db";
import { authenticateRequest } from "@/infrastructure/auth/auth-helpers";
import { commonErrors } from "@/infrastructure/http/api-response-helpers";
import { isAdmin } from "@/infrastructure/auth/auth";

/**
 * GET /api/monitor/lab/evaluations
 *
 * Fetches recent evaluations with their pipeline telemetry for the Lab UI.
 * Admin-only endpoint.
 *
 * Query params:
 * - limit: number of evaluations to fetch (default 20, max 100)
 * - agentId: optional filter by agent ID
 */
export async function GET(request: NextRequest) {
  const userId = await authenticateRequest(request);
  if (!userId) {
    return commonErrors.unauthorized();
  }

  const adminCheck = await isAdmin();
  if (!adminCheck) {
    return commonErrors.forbidden();
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
  const agentId = searchParams.get("agentId");

  try {
    // Build where clause
    const where: Prisma.EvaluationVersionWhereInput = {
      pipelineTelemetry: { not: Prisma.JsonNull },
      ...(agentId && { evaluation: { agentId } }),
    };

    // Get recent evaluation versions with telemetry
    const versions = await prisma.evaluationVersion.findMany({
      where,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        version: true,
        grade: true,
        summary: true,
        createdAt: true,
        pipelineTelemetry: true,
        evaluation: {
          select: {
            id: true,
            document: {
              select: {
                id: true,
                versions: {
                  select: { title: true },
                  orderBy: { version: "desc" as const },
                  take: 1,
                },
              },
            },
            agent: {
              select: {
                id: true,
                versions: {
                  select: { name: true },
                  orderBy: { version: "desc" as const },
                  take: 1,
                },
              },
            },
          },
        },
        comments: {
          select: {
            id: true,
            header: true,
            description: true,
            importance: true,
            highlight: {
              select: {
                quotedText: true,
              },
            },
          },
        },
      },
    });

    // Transform to Lab UI format
    const evaluations = versions.map((v) => {
      const telemetry = v.pipelineTelemetry as Record<string, unknown> | null;

      return {
        id: v.id,
        evaluationId: v.evaluation.id,
        version: v.version,
        grade: v.grade,
        summary: v.summary,
        createdAt: v.createdAt.toISOString(),
        documentId: v.evaluation.document.id,
        documentTitle: v.evaluation.document.versions[0]?.title || "Untitled",
        agentId: v.evaluation.agent.id,
        agentName: v.evaluation.agent.versions[0]?.name || "Unknown Agent",
        comments: v.comments.map((c) => ({
          id: c.id,
          header: c.header,
          description: c.description,
          importance: c.importance,
          quotedText: c.highlight.quotedText || "",
        })),
        // Telemetry data (matches ComparisonData structure)
        telemetry: telemetry ? {
          stages: telemetry.stages,
          extractionPhase: telemetry.extractionPhase,
          filteredItems: telemetry.filteredItems,
          passedItems: telemetry.passedItems,
          pipelineCounts: telemetry.finalCounts,
          totalDurationMs: telemetry.totalDurationMs,
          totalCostUsd: telemetry.totalCostUsd,
          documentLength: telemetry.documentLength,
          profileInfo: telemetry.profileInfo,
        } : null,
      };
    });

    return NextResponse.json({ evaluations });
  } catch (error) {
    logger.error("Error fetching evaluations with telemetry:", error);
    return commonErrors.serverError("Failed to fetch evaluations");
  }
}
