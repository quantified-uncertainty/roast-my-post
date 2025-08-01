import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { z } from "zod";

import { commonErrors } from "@/lib/api-response-helpers";
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
      evaluations = evaluations.filter(eval => agentIds.includes(eval.agentId));
    }

    // Transform to API format
    const evaluationsData = evaluations.map(evaluation => ({
      id: evaluation.id,
      agentId: evaluation.agentId,
      agentName: evaluation.agentName,
      currentVersion: {
        version: evaluation.version,
        grade: evaluation.grade,
        summary: evaluation.summary,
        hasComments: evaluation.comments.length > 0,
        commentCount: evaluation.comments.length,
        createdAt: evaluation.createdAt,
      },
      isStale: evaluation.isStale,
      totalVersions: evaluation.allVersions?.length || 1,
      latestJobStatus: evaluation.jobStatus || "NO_JOB",
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
      return commonErrors.badRequest("Invalid query parameters", error.errors);
    }
    
    logger.error('Error fetching document evaluations:', error);
    return commonErrors.serverError("Failed to fetch evaluations");
  }
}