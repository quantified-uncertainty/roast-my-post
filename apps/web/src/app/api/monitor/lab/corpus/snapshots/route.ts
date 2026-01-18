import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/infrastructure/logging/logger";
import { authenticateRequest } from "@/infrastructure/auth/auth-helpers";
import { commonErrors } from "@/infrastructure/http/api-response-helpers";
import { isAdmin } from "@/infrastructure/auth/auth";
import { metaEvaluationRepository } from "@roast/db";

// Get evaluation snapshots for a set of documents (used when creating baselines)
export async function GET(request: NextRequest) {
  const userId = await authenticateRequest(request);
  if (!userId) return commonErrors.unauthorized();

  const adminCheck = await isAdmin();
  if (!adminCheck) return commonErrors.forbidden();

  const agentId = request.nextUrl.searchParams.get("agentId");
  const documentIdsParam = request.nextUrl.searchParams.get("documentIds");

  if (!agentId || !documentIdsParam) {
    return NextResponse.json(
      { error: "agentId and documentIds are required" },
      { status: 400 }
    );
  }

  const documentIds = documentIdsParam.split(",").filter(Boolean);
  if (documentIds.length === 0) {
    return NextResponse.json({ error: "documentIds cannot be empty" }, { status: 400 });
  }

  try {
    const snapshots = await metaEvaluationRepository.getEvaluationSnapshots(documentIds, agentId);
    return NextResponse.json({ snapshots });
  } catch (error) {
    logger.error("Error fetching evaluation snapshots:", error);
    return commonErrors.serverError("Failed to fetch evaluation snapshots");
  }
}
