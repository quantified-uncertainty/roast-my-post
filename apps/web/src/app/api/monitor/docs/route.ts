import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/infrastructure/logging/logger";
import { DocumentRepository } from "@roast/db";
import { authenticateRequest } from "@/infrastructure/auth/auth-helpers";
import { commonErrors } from "@/infrastructure/http/api-response-helpers";
import { isAdmin } from "@/infrastructure/auth/auth";

const documentRepository = new DocumentRepository();

export async function GET(request: NextRequest) {
  const userId = await authenticateRequest(request);
  if (!userId) {
    return commonErrors.unauthorized();
  }

  const adminCheck = await isAdmin();
  if (!adminCheck) {
    return commonErrors.forbidden();
  }

  try {
    const docs = await documentRepository.findRecentForAdmin(20);
    return NextResponse.json({ docs });

  } catch (error) {
    logger.error('Error fetching documents:', error);
    return commonErrors.serverError("Failed to fetch documents");
  }
}
