import { NextRequest } from "next/server";

import { authenticateRequest } from "@/infrastructure/auth/auth-helpers";
import { logger } from "@/infrastructure/logging/logger";
import { importDocumentService } from "@/application/services/documentImport";
import { errorResponse, successResponse, commonErrors } from "@/infrastructure/http/api-response-helpers";
import { validateLlmAccess } from "@/infrastructure/http/guards";

export async function POST(request: NextRequest) {
  try {
    // Authenticate request (API key first, then session)
    const userId = await authenticateRequest(request);

    if (!userId) {
      return errorResponse("User must be logged in to import a document", 401);
    }

    const { url, importUrl, agentIds } = await request.json();
    if (!url) {
      return commonErrors.badRequest("URL is required");
    }

    // Validate agentIds if provided
    if (agentIds && !Array.isArray(agentIds)) {
      return commonErrors.badRequest("agentIds must be an array");
    }

    // Validate access (system pause + quota) if creating evaluations
    const requestedCount = agentIds?.length || 0;
    if (requestedCount > 0) {
      const accessError = await validateLlmAccess({ userId, requestedCount });
      if (accessError) return accessError;
    }

    // Use the shared import service
    const result = await importDocumentService(url || importUrl, userId, agentIds);
    
    if (!result.success) {
      return errorResponse(result.error || "Failed to import document", 400);
    }

    return successResponse({
      success: true,
      documentId: result.documentId,
      document: result.document,
      evaluations: result.evaluations,
    });
  } catch (error) {
    logger.error('Error in import API route:', error);
    return errorResponse(
      error instanceof Error ? error.message : "Failed to import document",
      500
    );
  }
}
