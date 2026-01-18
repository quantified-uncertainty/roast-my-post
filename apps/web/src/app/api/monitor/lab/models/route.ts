import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/infrastructure/logging/logger";
import { authenticateRequest } from "@/infrastructure/auth/auth-helpers";
import { commonErrors } from "@/infrastructure/http/api-response-helpers";
import { isAdmin } from "@/infrastructure/auth/auth";
import { getAllModels } from "@roast/ai";

/**
 * GET /api/monitor/lab/models
 * Fetch all available models from Anthropic + OpenRouter
 */
export async function GET(request: NextRequest) {
  const userId = await authenticateRequest(request);
  if (!userId) return commonErrors.unauthorized();

  const adminCheck = await isAdmin();
  if (!adminCheck) return commonErrors.forbidden();

  try {
    const models = await getAllModels();
    return NextResponse.json({ models });
  } catch (error) {
    logger.error("Error fetching models:", error);
    return commonErrors.serverError("Failed to fetch models");
  }
}
