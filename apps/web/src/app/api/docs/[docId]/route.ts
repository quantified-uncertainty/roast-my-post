import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { z } from "zod";

import { DocumentModel } from "@/models/Document";
import { authenticateRequest } from "@/lib/auth-helpers";
import { commonErrors } from "@/lib/api-response-helpers";

const updateDocumentSchema = z.object({
  intendedAgentIds: z.array(z.string()).optional(),
});

export async function GET(req: NextRequest, context: { params: Promise<{ docId: string }> }) {
  const params = await context.params;
  const { docId } = params;

  try {
    // Use the DocumentModel to get a formatted document
    const document = await DocumentModel.getDocumentWithEvaluations(docId);

    if (!document) {
      return commonErrors.notFound("Document not found");
    }

    return NextResponse.json({ document });
  } catch (error) {
    logger.error('Error fetching document:', error);
    return commonErrors.serverError("Failed to fetch document");
  }
}

export async function PUT(req: NextRequest, context: { params: Promise<{ docId: string }> }) {
  const params = await context.params;
  const { docId } = params;

  try {
    // Authenticate request
    const userId = await authenticateRequest(req);
    if (!userId) {
      return commonErrors.unauthorized();
    }

    // Parse and validate request body
    const body = await req.json();
    const { intendedAgentIds } = updateDocumentSchema.parse(body);

    if (!intendedAgentIds) {
      return NextResponse.json({
        success: true,
        message: "No updates provided",
      });
    }

    // Use existing document update logic from the old API
    // Import the PUT logic from the existing documents API
    const { updateDocumentWithAgents } = await import("@/lib/document-operations");
    
    const result = await updateDocumentWithAgents(docId, intendedAgentIds, userId);

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return commonErrors.badRequest("Invalid request data", error.errors);
    }
    
    logger.error('Error updating document:', error);
    return commonErrors.serverError("Failed to update document");
  }
}