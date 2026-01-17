import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/infrastructure/logging/logger";
import { authenticateRequest } from "@/infrastructure/auth/auth-helpers";
import { commonErrors } from "@/infrastructure/http/api-response-helpers";
import { isAdmin } from "@/infrastructure/auth/auth";
import { metaEvaluationRepository } from "@roast/db";

export async function GET(request: NextRequest) {
  const userId = await authenticateRequest(request);
  if (!userId) return commonErrors.unauthorized();

  const adminCheck = await isAdmin();
  if (!adminCheck) return commonErrors.forbidden();

  const agentId = request.nextUrl.searchParams.get("agentId");
  const filter = request.nextUrl.searchParams.get("filter") || undefined;
  const limit = parseInt(request.nextUrl.searchParams.get("limit") || "500", 10);

  if (!agentId) {
    return NextResponse.json({ error: "agentId is required" }, { status: 400 });
  }

  try {
    const documents = await metaEvaluationRepository.getValidationCorpusDocuments(agentId, {
      filter,
      limit,
    });
    return NextResponse.json({ documents });
  } catch (error) {
    logger.error("Error fetching corpus documents:", error);
    return commonErrors.serverError("Failed to fetch corpus documents");
  }
}
