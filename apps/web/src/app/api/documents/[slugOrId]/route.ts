import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { DocumentService } from "@/lib/services/DocumentService";
import { authenticateRequest } from "@/lib/auth-helpers";
import { NotFoundError, AuthorizationError, ValidationError } from "@/lib/core/errors";

// Initialize service
const documentService = new DocumentService();

export async function GET(req: NextRequest, context: { params: Promise<{ slugOrId: string }> }) {
  const params = await context.params;
  const { slugOrId: id } = params;

  try {
    // Check if user is authenticated (optional for read)
    const userId = await authenticateRequest(req).catch(() => undefined);
    
    // Use the new DocumentService
    const result = await documentService.getDocumentForReader(id, userId);

    if (result.isError()) {
      const error = result.error();
      if (error instanceof NotFoundError) {
        return NextResponse.json(
          { error: "Document not found" },
          { status: 404 }
        );
      }
      
      logger.error('Error fetching document:', error);
      return NextResponse.json(
        { error: error?.message || "Failed to fetch document" },
        { status: error?.statusCode || 500 }
      );
    }

    return NextResponse.json(result.unwrap());
  } catch (error) {
    logger.error('Unexpected error fetching document:', error);
    return NextResponse.json(
      { error: "Failed to fetch document" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest, context: { params: Promise<{ slugOrId: string }> }) {
  const params = await context.params;
  const { slugOrId: id } = params;

  try {
    // Authenticate request
    const userId = await authenticateRequest(req);
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get request body
    const body = await req.json();
    const { title, content, intendedAgentIds } = body;

    // Use the new DocumentService for update
    const result = await documentService.updateDocument(id, userId, {
      title,
      content,
      intendedAgentIds
    });

    if (result.isError()) {
      const error = result.error();
      if (error instanceof NotFoundError) {
        return NextResponse.json(
          { error: "Document not found" },
          { status: 404 }
        );
      }
      
      // Check for authorization errors
      if (error instanceof AuthorizationError) {
        return NextResponse.json(
          { error: error.message },
          { status: 403 }
        );
      }
      
      // Check for validation errors
      if (error instanceof ValidationError) {
        return NextResponse.json(
          { error: error.message, details: error.details },
          { status: 400 }
        );
      }
      
      logger.error('Error updating document:', error);
      return NextResponse.json(
        { error: error?.message || "Failed to update document" },
        { status: error?.statusCode || 500 }
      );
    }

    // TODO: Handle evaluation creation separately through EvaluationService
    // For now, just return success
    return NextResponse.json({
      success: true,
      documentId: id,
      message: "Document updated successfully"
    });
  } catch (error) {
    logger.error('Unexpected error updating document:', error);
    return NextResponse.json(
      { error: "Failed to update document" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ slugOrId: string }> }) {
  const params = await context.params;
  const { slugOrId: id } = params;

  try {
    // Authenticate request
    const userId = await authenticateRequest(req);
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Use the new DocumentService for deletion
    const result = await documentService.deleteDocument(id, userId);

    if (result.isError()) {
      const error = result.error();
      if (error instanceof NotFoundError) {
        return NextResponse.json(
          { error: "Document not found" },
          { status: 404 }
        );
      }
      
      if (error instanceof AuthorizationError) {
        return NextResponse.json(
          { error: error.message },
          { status: 403 }
        );
      }
      
      logger.error('Error deleting document:', error);
      return NextResponse.json(
        { error: error?.message || "Failed to delete document" },
        { status: error?.statusCode || 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Document deleted successfully"
    });
  } catch (error) {
    logger.error('Unexpected error deleting document:', error);
    return NextResponse.json(
      { error: "Failed to delete document" },
      { status: 500 }
    );
  }
}
