import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { authenticateRequest } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { DocumentModel } from "@/models/Document";

export async function GET(request: NextRequest) {
  try {
    const userId = await authenticateRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const searchContent = searchParams.get("searchContent") === "true";

    // If no query, return recent documents
    if (!query || query.trim().length === 0) {
      const documents = await DocumentModel.getRecentDocumentsWithEvaluations(limit);
      const totalCount = await prisma.document.count();
      
      return NextResponse.json({
        documents,
        total: totalCount,
        hasMore: totalCount > offset + limit,
      });
    }

    // Build search conditions
    const searchConditions: any[] = [
      // Always search in metadata (searchableText)
      {
        versions: {
          some: {
            searchableText: { contains: query.toLowerCase() },
          },
        },
      },
      // Always search agent names
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
    ];

    // Optionally search in content
    if (searchContent) {
      searchConditions.push({
        versions: {
          some: {
            content: { contains: query, mode: 'insensitive' },
          },
        },
      });
    }

    // Find matching documents efficiently at the database level
    const matchingDocs = await prisma.document.findMany({
      where: {
        OR: searchConditions,
      },
      take: limit,
      skip: offset,
      orderBy: { publishedDate: "desc" },
      include: {
        versions: true,
        submittedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        evaluations: {
          include: {
            jobs: {
              orderBy: {
                createdAt: "desc",
              },
            },
            agent: {
              include: {
                versions: {
                  orderBy: {
                    version: "desc",
                  },
                  take: 1,
                },
              },
            },
            versions: {
              include: {
                comments: {
                  include: {
                    highlight: true,
                  },
                },
                job: {
                  include: {
                    tasks: true,
                  },
                },
                documentVersion: {
                  select: {
                    version: true,
                  },
                },
              },
              orderBy: {
                createdAt: "desc",
              },
            },
          },
        },
      },
    });

    // Format the documents using our existing formatter
    const filteredDocs = matchingDocs.map((dbDoc) => DocumentModel.formatDocumentFromDB(dbDoc));

    // Count total matches for pagination
    const totalCount = await prisma.document.count({
      where: {
        OR: searchConditions,
      },
    });

    return NextResponse.json({
      documents: filteredDocs,
      total: totalCount,
      hasMore: totalCount > offset + limit,
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