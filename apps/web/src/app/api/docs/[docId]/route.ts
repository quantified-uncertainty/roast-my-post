import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/infrastructure/logging/logger";
import { z } from "zod";

import { DocumentModel } from "@/models/Document";
import { authenticateRequest } from "@/infrastructure/auth/auth-helpers";
import { commonErrors } from "@/infrastructure/http/api-response-helpers";
import { withSecurity } from "@/infrastructure/http/security-middleware";
import { prisma } from "@roast/db";

const updateDocumentSchema = z.object({
  intendedAgentIds: z.array(z.string()).optional(),
});

// GET endpoint checks privacy based on authentication
export async function GET(req: NextRequest, context: { params: Promise<{ docId: string }> }) {
  const params = await context.params;
  const { docId } = params;

  try {
    // Get requesting user (optional - supports both authenticated and anonymous)
    const requestingUserId = await authenticateRequest(req);
    
    // Use the DocumentModel to get a formatted document with privacy check
    const document = await DocumentModel.getDocumentWithEvaluations(docId, false, requestingUserId);

    if (!document) {
      return commonErrors.notFound("Document not found");
    }

    return NextResponse.json({ document });
  } catch (error) {
    logger.error('Error fetching document:', error);
    return commonErrors.serverError();
  }
}

export const PUT = withSecurity(
  async (req: NextRequest, context: { params: Promise<{ docId: string }> }) => {
    const params = await context.params;
    const { docId } = params;
    const userId = (await authenticateRequest(req))!;
    const body = (req as any).validatedBody;

    try {
      const { intendedAgentIds } = body;

    if (!intendedAgentIds) {
      return NextResponse.json({
        success: true,
        message: "No updates provided",
      });
    }

    // Use document update logic
    // Import the PUT logic from the documents API
    const { updateDocumentWithAgents } = await import("@/application/services/document-operations");
    
    const result = await updateDocumentWithAgents(docId, intendedAgentIds, userId!);

      return NextResponse.json(result);
    } catch (error) {
      logger.error('Error updating document:', error);
      return commonErrors.serverError();
    }
  },
  {
    requireAuth: true,
    validateBody: updateDocumentSchema,
    checkOwnership: async (userId: string, request: NextRequest) => {
      // Extract docId from URL path - matches /api/docs/{docId}
      const url = new URL(request.url);
      const pathMatch = url.pathname.match(/\/api\/docs\/([^\/]+)/);
      const docId = pathMatch?.[1];
      
      if (!docId) {
        return false;
      }
      
      const document = await prisma.document.findUnique({
        where: { id: docId },
        select: { submittedById: true }
      });
      return document?.submittedById === userId;
    }
  }
);