import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logger } from "@/infrastructure/logging/logger";
import { authenticateRequest } from "@/infrastructure/auth/auth-helpers";
import { commonErrors } from "@/infrastructure/http/api-response-helpers";
import { isAdmin } from "@/infrastructure/auth/auth";
import { metaEvaluationRepository } from "@roast/db";

const querySchema = z.object({
  agentId: z.string().min(1, "agentId is required"),
  filter: z.string().optional(),
  limit: z.coerce.number().min(1).max(1000).default(500),
});

export async function GET(request: NextRequest) {
  const userId = await authenticateRequest(request);
  if (!userId) return commonErrors.unauthorized();

  const adminCheck = await isAdmin();
  if (!adminCheck) return commonErrors.forbidden();

  const params = request.nextUrl.searchParams;
  const parsed = querySchema.safeParse({
    agentId: params.get("agentId"),
    filter: params.get("filter") ?? undefined,
    limit: params.get("limit") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message || "Invalid parameters" },
      { status: 400 }
    );
  }

  const { agentId, filter, limit } = parsed.data;

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
