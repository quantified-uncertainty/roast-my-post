import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/infrastructure/logging/logger";
import { authenticateRequest } from "@/infrastructure/auth/auth-helpers";
import { getServices } from "@/application/services/ServiceFactory";

export async function GET(request: NextRequest) {
  try {
    const userId = await authenticateRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get services from factory
    const { documentService } = getServices();

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const _offset = parseInt(searchParams.get("offset") || "0", 10);
    const _searchContent = searchParams.get("searchContent") === "true";

    // If no query, return recent documents
    if (!query || query.trim().length === 0) {
      const result = await documentService.getRecentDocuments(limit);
      
      if (result.isError()) {
        logger.error('Error fetching recent documents:', result.error());
        return NextResponse.json(
          { error: "Failed to fetch recent documents" },
          { status: 500 }
        );
      }
      
      const documents = result.unwrap();
      
      return NextResponse.json({
        documents,
        total: documents.length,
        hasMore: documents.length >= limit,
      });
    }

    // Use the search method from DocumentService
    const result = await documentService.searchDocuments(query, limit);
    
    if (result.isError()) {
      logger.error('Search error:', result.error());
      return NextResponse.json(
        { error: result.error()?.message || "Failed to search documents" },
        { status: 500 }
      );
    }

    const documents = result.unwrap();

    return NextResponse.json({
      documents,
      total: documents.length,
      hasMore: documents.length >= limit,
      query,
    });
  } catch (error) {
    logger.error('Search error:', error);
    return NextResponse.json(
      { error: "Failed to search documents" },
      { status: 500 }
    );
  }
}