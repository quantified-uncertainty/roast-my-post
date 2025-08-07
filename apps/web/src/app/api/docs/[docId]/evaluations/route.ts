import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/infrastructure/logging/logger";
import { z } from "zod";

import { commonErrors } from "@/infrastructure/http/api-response-helpers";
import { DocumentModel } from "@/models/Document";

const queryEvaluationsSchema = z.object({
  includeStale: z.coerce.boolean().optional().default(false),
  agentIds: z.string().optional().transform(val => val ? val.split(',') : undefined),
});

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ docId: string }> }
) {
  const params = await context.params;
  const { docId } = params;

  try {
    const url = new URL(req.url);
    const queryParams = Object.fromEntries(url.searchParams);
    const { includeStale, agentIds } = queryEvaluationsSchema.parse(queryParams);

    // Get document with all evaluations
    const document = await DocumentModel.getDocumentWithEvaluations(docId, includeStale);

    if (!document) {
      return commonErrors.notFound("Document not found");
    }

    // Filter evaluations by agent IDs if provided
    let evaluations = document.reviews;
    if (agentIds && agentIds.length > 0) {
      evaluations = evaluations.filter(evaluation => agentIds.includes(evaluation.agentId));
    }

    // Transform to API format
    const evaluationsData = evaluations.map(evaluation => ({
      id: evaluation.id,
      agentId: evaluation.agentId,
      agentName: evaluation.agent.name,
      currentVersion: {
        version: evaluation.versions?.length || 1,
        grade: evaluation.grade,
        summary: evaluation.summary,
        hasComments: evaluation.comments.length > 0,
        commentCount: evaluation.comments.length,
        createdAt: evaluation.createdAt,
      },
      isStale: evaluation.isStale,
      totalVersions: evaluation.versions?.length || 1,
      latestJobStatus: "COMPLETED",
    }));

    return NextResponse.json({
      document: {
        id: docId,
        title: document.title,
      },
      evaluations: evaluationsData,
      summary: {
        total: evaluationsData.length,
        withGrades: evaluationsData.filter(e => e.currentVersion.grade !== null).length,
        withComments: evaluationsData.filter(e => e.currentVersion.hasComments).length,
        stale: evaluationsData.filter(e => e.isStale).length,
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return commonErrors.badRequest("Invalid query parameters");
    }
    
    logger.error('Error fetching document evaluations:', error);
    return commonErrors.serverError();
  }
}