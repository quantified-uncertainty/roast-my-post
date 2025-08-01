import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { z } from "zod";

import { prisma } from "@roast/db";
import { authenticateRequest } from "@/lib/auth-helpers";
import { commonErrors } from "@/lib/api-response-helpers";
import { getEvaluationForDisplay, extractEvaluationDisplayData } from "@/lib/evaluation/evaluationQueries";

const createEvaluationSchema = z.object({
  reason: z.string().optional(),
});

export async function GET(
  req: NextRequest, 
  context: { params: Promise<{ docId: string; agentId: string }> }
) {
  const params = await context.params;
  const { docId, agentId } = params;

  try {
    // Get evaluation data using existing query logic
    const evaluation = await getEvaluationForDisplay(docId, agentId);

    if (!evaluation) {
      return commonErrors.notFound(`No evaluation found for agent '${agentId}' on document '${docId}'`);
    }

    // Extract display data
    const evaluationData = extractEvaluationDisplayData(evaluation);

    return NextResponse.json({
      evaluation: {
        id: evaluation.id,
        documentId: docId,
        agentId,
        agentName: evaluation.agent.versions[0]?.name || "Unknown Agent",
        currentVersion: {
          version: evaluationData.version,
          grade: evaluationData.grade,
          summary: evaluationData.summary,
          analysis: evaluationData.analysis,
          selfCritique: evaluationData.selfCritique,
          comments: evaluationData.comments,
          job: {
            status: evaluation.versions[0]?.job?.status || "NO_JOB",
            priceInDollars: evaluation.versions[0]?.job?.priceInDollars || null,
            durationInSeconds: evaluation.versions[0]?.job?.durationInSeconds || null,
            tasks: [],
          },
          createdAt: evaluationData.createdAt,
        },
        isStale: evaluationData.isStale,
        totalVersions: evaluation.versions.length,
        document: {
          title: evaluation.document.versions[0]?.title || "Untitled",
          id: docId,
        },
      }
    });
  } catch (error) {
    logger.error('Error fetching evaluation:', error);
    return commonErrors.serverError();
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ docId: string; agentId: string }> }
) {
  const params = await context.params;
  const { docId, agentId } = params;

  try {
    // Authenticate request
    const userId = await authenticateRequest(req);
    if (!userId) {
      return commonErrors.unauthorized();
    }

    // Parse request body
    const body = await req.json().catch(() => ({}));
    const { reason } = createEvaluationSchema.parse(body);

    // Verify document exists
    const document = await prisma.document.findUnique({
      where: { id: docId },
    });

    if (!document) {
      return commonErrors.notFound("Document not found");
    }

    // Verify agent exists
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
    });

    if (!agent) {
      return commonErrors.notFound("Agent not found");
    }

    // Create or get existing evaluation
    const result = await prisma.$transaction(async (tx) => {
      // Check if evaluation already exists
      const existing = await tx.evaluation.findFirst({
        where: { documentId: docId, agentId }
      });
      
      if (existing) {
        // Create new job for re-evaluation
        const job = await tx.job.create({
          data: {
            evaluationId: existing.id,
            status: 'PENDING',
          }
        });
        
        return { evaluation: existing, job, created: false };
      }
      
      // Create new evaluation
      const evaluation = await tx.evaluation.create({
        data: {
          documentId: docId,
          agentId,
        }
      });
      
      // Create job
      const job = await tx.job.create({
        data: {
          evaluationId: evaluation.id,
          status: 'PENDING',
        }
      });
      
      return { evaluation, job, created: true };
    });

    return NextResponse.json({
      success: true,
      evaluation: {
        id: result.evaluation.id,
        documentId: docId,
        agentId,
        created: result.created,
      },
      job: {
        id: result.job.id,
        status: result.job.status,
      },
      message: result.created 
        ? "Evaluation created successfully"
        : `Evaluation re-run initiated${reason ? `: ${reason}` : ""}`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return commonErrors.badRequest("Invalid request data");
    }
    
    logger.error('Error creating evaluation:', error);
    return commonErrors.serverError();
  }
}

