import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/infrastructure/logging/logger";
import { authenticateRequest } from "@/infrastructure/auth/auth-helpers";
import { commonErrors } from "@/infrastructure/http/api-response-helpers";
import { isAdmin } from "@/infrastructure/auth/auth";
import { prisma } from "@roast/db";

export async function GET(request: NextRequest) {
  const userId = await authenticateRequest(request);
  if (!userId) return commonErrors.unauthorized();

  const adminCheck = await isAdmin();
  if (!adminCheck) return commonErrors.forbidden();

  const agentId = request.nextUrl.searchParams.get("agentId");
  const documentId = request.nextUrl.searchParams.get("documentId");
  const beforeDate = request.nextUrl.searchParams.get("beforeDate");

  if (!agentId || !documentId) {
    return NextResponse.json(
      { error: "agentId and documentId are required" },
      { status: 400 }
    );
  }

  try {
    const versions = await prisma.evaluationVersion.findMany({
      where: {
        agentId,
        evaluation: { documentId },
        ...(beforeDate ? { createdAt: { lt: new Date(beforeDate) } } : {}),
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        createdAt: true,
        grade: true,
        summary: true,
        version: true,
      },
    });

    return NextResponse.json({
      versions: versions.map((v) => ({
        id: v.id,
        createdAt: v.createdAt.toISOString(),
        grade: v.grade,
        summary: v.summary,
        version: v.version,
      })),
    });
  } catch (error) {
    logger.error("Error fetching evaluation versions:", error);
    return commonErrors.serverError("Failed to fetch evaluation versions");
  }
}
