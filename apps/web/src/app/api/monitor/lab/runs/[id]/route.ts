import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/infrastructure/logging/logger";
import { authenticateRequest } from "@/infrastructure/auth/auth-helpers";
import { commonErrors } from "@/infrastructure/http/api-response-helpers";
import { isAdmin } from "@/infrastructure/auth/auth";
import { metaEvaluationRepository } from "@roast/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await authenticateRequest(request);
  if (!userId) return commonErrors.unauthorized();

  const adminCheck = await isAdmin();
  if (!adminCheck) return commonErrors.forbidden();

  const { id } = await params;

  try {
    const run = await metaEvaluationRepository.getValidationRunDetail(id);
    if (!run) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }
    return NextResponse.json({ run });
  } catch (error) {
    logger.error("Error fetching run detail:", error);
    return commonErrors.serverError("Failed to fetch run detail");
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await authenticateRequest(request);
  if (!userId) return commonErrors.unauthorized();

  const adminCheck = await isAdmin();
  if (!adminCheck) return commonErrors.forbidden();

  const { id } = await params;

  try {
    await metaEvaluationRepository.deleteValidationRun(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Error deleting run:", error);
    return commonErrors.serverError("Failed to delete run");
  }
}
