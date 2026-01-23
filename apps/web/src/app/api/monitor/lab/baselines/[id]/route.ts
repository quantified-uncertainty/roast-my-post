import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/infrastructure/logging/logger";
import { authenticateRequest } from "@/infrastructure/auth/auth-helpers";
import { commonErrors } from "@/infrastructure/http/api-response-helpers";
import { isAdmin } from "@/infrastructure/auth/auth";
import { metaEvaluationRepository } from "@roast/db";
import type { RouteIdParams } from "../../types";

export async function DELETE(
  request: NextRequest,
  { params }: RouteIdParams
) {
  const userId = await authenticateRequest(request);
  if (!userId) return commonErrors.unauthorized();

  const adminCheck = await isAdmin();
  if (!adminCheck) return commonErrors.forbidden();

  const { id } = await params;

  try {
    await metaEvaluationRepository.deleteValidationBaseline(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Error deleting baseline:", error);
    return commonErrors.serverError("Failed to delete baseline");
  }
}
