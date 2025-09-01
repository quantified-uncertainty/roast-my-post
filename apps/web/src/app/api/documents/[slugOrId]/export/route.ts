import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/infrastructure/logging/logger";
import { DocumentModel } from "@/models/Document";
import { authenticateRequest } from "@/infrastructure/auth/auth-helpers";
import { DocumentExportService } from "@/infrastructure/export/document-export-service";
import { PrivacyService } from "@/infrastructure/auth/privacy-service";

export async function GET(req: NextRequest, context: { params: Promise<{ slugOrId: string }> }) {
  const params = await context.params;
  const { slugOrId: id } = params;
  const searchParams = req.nextUrl.searchParams;
  const format = searchParams.get('format') || 'json';

  try {
    // Get requesting user (optional - supports both authenticated and anonymous)
    const requestingUserId = await authenticateRequest(req);
    
    // Use the DocumentModel to get a formatted document with all evaluations (respects privacy)
    const document = await DocumentModel.getDocumentWithEvaluations(id, false, requestingUserId);

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // Use centralized cache headers from PrivacyService (defaults to public if undefined)
    const cacheHeaders = PrivacyService.getCacheHeaders(document.isPrivate ?? false);

    // Use DocumentExportService for cleaner export logic
    const exportResult = DocumentExportService.export(document, format);
    
    // Return appropriate response based on content type
    if (typeof exportResult.content === 'string') {
      return new NextResponse(exportResult.content, {
        headers: {
          'Content-Type': exportResult.contentType,
          'Content-Disposition': `attachment; filename="${exportResult.fileName}"`,
          ...cacheHeaders,
        },
      });
    } else {
      return NextResponse.json(exportResult.content, {
        headers: {
          'Content-Type': exportResult.contentType,
          'Content-Disposition': `attachment; filename="${exportResult.fileName}"`,
          ...cacheHeaders,
        },
      });
    }
  } catch (error) {
    logger.error('Error exporting document:', error);
    return NextResponse.json(
      { error: "Failed to export document" },
      { status: 500 }
    );
  }
}