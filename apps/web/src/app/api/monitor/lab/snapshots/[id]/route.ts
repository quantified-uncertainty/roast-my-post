import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/infrastructure/logging/logger";
import { authenticateRequest } from "@/infrastructure/auth/auth-helpers";
import { commonErrors } from "@/infrastructure/http/api-response-helpers";
import { isAdmin } from "@/infrastructure/auth/auth";
import { prisma } from "@roast/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await authenticateRequest(request);
  if (!userId) return commonErrors.unauthorized();

  const adminCheck = await isAdmin();
  if (!adminCheck) return commonErrors.forbidden();

  const { id } = await params;

  try {
    // Get the run snapshot with full comparison data
    const snapshot = await prisma.validationRunSnapshot.findUnique({
      where: { id },
      include: {
        baselineSnapshot: {
          include: {
            evaluationVersion: {
              include: {
                evaluation: {
                  include: {
                    document: {
                      include: {
                        versions: {
                          orderBy: { version: "desc" },
                          take: 1,
                          select: { title: true },
                        },
                      },
                    },
                  },
                },
                comments: {
                  include: { highlight: true },
                },
              },
            },
          },
        },
        newEvaluation: {
          include: {
            comments: {
              include: { highlight: true },
            },
          },
        },
      },
    });

    if (!snapshot) {
      return NextResponse.json({ error: "Snapshot not found" }, { status: 404 });
    }

    // Format baseline comments
    const baselineComments = snapshot.baselineSnapshot.evaluationVersion.comments.map((c) => ({
      id: c.id,
      quotedText: c.highlight.quotedText,
      header: c.header,
      description: c.description,
      importance: c.importance,
    }));

    // Format current comments
    const currentComments = snapshot.newEvaluation.comments.map((c) => ({
      id: c.id,
      quotedText: c.highlight.quotedText,
      header: c.header,
      description: c.description,
      importance: c.importance,
    }));

    return NextResponse.json({
      snapshot: {
        id: snapshot.id,
        status: snapshot.status,
        keptCount: snapshot.keptCount,
        newCount: snapshot.newCount,
        lostCount: snapshot.lostCount,
        documentTitle:
          snapshot.baselineSnapshot.evaluationVersion.evaluation.document.versions[0]?.title ||
          "Unknown",
        comparisonData: snapshot.comparisonData,
        baselineComments,
        currentComments,
      },
    });
  } catch (error) {
    logger.error("Error fetching snapshot:", error);
    return commonErrors.serverError("Failed to fetch snapshot");
  }
}
