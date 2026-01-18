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

  const baselineId = request.nextUrl.searchParams.get("baselineId");
  if (!baselineId) {
    return NextResponse.json({ error: "baselineId is required" }, { status: 400 });
  }

  try {
    const runs = await metaEvaluationRepository.getValidationRuns(baselineId);
    return NextResponse.json({ runs });
  } catch (error) {
    logger.error("Error fetching runs:", error);
    return commonErrors.serverError("Failed to fetch runs");
  }
}

export async function POST(request: NextRequest) {
  const userId = await authenticateRequest(request);
  if (!userId) return commonErrors.unauthorized();

  const adminCheck = await isAdmin();
  if (!adminCheck) return commonErrors.forbidden();

  try {
    const body = await request.json();
    const { baselineId, name } = body;

    if (!baselineId) {
      return NextResponse.json({ error: "baselineId is required" }, { status: 400 });
    }

    // Create the run record
    const run = await metaEvaluationRepository.createValidationRun({
      baselineId,
      name,
    });

    // Note: The actual evaluation execution would be triggered separately
    // (e.g., via a job queue). For now, we just create the run record.
    // The CLI handles the actual pipeline execution.

    return NextResponse.json({ run });
  } catch (error) {
    logger.error("Error creating run:", error);
    return commonErrors.serverError("Failed to create run");
  }
}
