import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DocumentModel } from "@/models/Document";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    // If no query, return recent documents
    if (!query || query.trim().length === 0) {
      const documents = await DocumentModel.getAllDocumentsWithEvaluations();
      const paginatedDocs = documents.slice(offset, offset + limit);
      
      return NextResponse.json({
        documents: paginatedDocs,
        total: documents.length,
        hasMore: documents.length > offset + limit,
      });
    }

    // Search with ILIKE
    const searchPattern = `%${query}%`;
    
    // Find matching document IDs through various fields
    const matchingDocs = await prisma.document.findMany({
      where: {
        OR: [
          {
            versions: {
              some: {
                OR: [
                  { title: { contains: query, mode: 'insensitive' } },
                  { authors: { hasSome: [query] } },
                  { platforms: { hasSome: [query] } },
                  // Limit content search to first 500 chars for performance
                  { content: { contains: query, mode: 'insensitive' } },
                ],
              },
            },
          },
          {
            evaluations: {
              some: {
                agent: {
                  versions: {
                    some: {
                      name: { contains: query, mode: 'insensitive' },
                    },
                  },
                },
              },
            },
          },
        ],
      },
      select: { id: true },
      take: limit,
      skip: offset,
    });

    // Get full documents with evaluations
    const documentIds = matchingDocs.map(doc => doc.id);
    const documents = await DocumentModel.getAllDocumentsWithEvaluations();
    const filteredDocs = documents.filter(doc => documentIds.includes(doc.id));

    // Count total matches for pagination
    const totalCount = await prisma.document.count({
      where: {
        OR: [
          {
            versions: {
              some: {
                OR: [
                  { title: { contains: query, mode: 'insensitive' } },
                  { authors: { hasSome: [query] } },
                  { platforms: { hasSome: [query] } },
                  { content: { contains: query, mode: 'insensitive' } },
                ],
              },
            },
          },
          {
            evaluations: {
              some: {
                agent: {
                  versions: {
                    some: {
                      name: { contains: query, mode: 'insensitive' },
                    },
                  },
                },
              },
            },
          },
        ],
      },
    });

    return NextResponse.json({
      documents: filteredDocs,
      total: totalCount,
      hasMore: totalCount > offset + limit,
      query,
    });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Failed to search documents" },
      { status: 500 }
    );
  }
}