import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

import { DocumentModel } from "@/models/Document";
import { authenticateRequest } from "@/lib/auth-helpers";
import { prisma } from "@roast/db";

export async function GET(req: NextRequest, context: { params: Promise<{ slugOrId: string }> }) {
  const params = await context.params;
  const { slugOrId: id } = params;

  try {
    // Use the DocumentModel to get a formatted document
    const document = await DocumentModel.getDocumentWithEvaluations(id);

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(document);
  } catch (error) {
    logger.error('Error fetching document:', error);
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
    const { intendedAgentIds } = body;

    // Verify document exists
    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        versions: {
          orderBy: { version: "desc" },
          take: 1,
        },
      },
    });

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    const latestVersion = document.versions[0];
    if (!latestVersion) {
      return NextResponse.json(
        { error: "Document has no versions" },
        { status: 400 }
      );
    }

    // Update intended agents if provided
    if (intendedAgentIds !== undefined) {
      await prisma.documentVersion.update({
        where: { id: latestVersion.id },
        data: {
          intendedAgents: intendedAgentIds,
        },
      });

      // Create evaluations and jobs for new agents
      const existingEvaluations = await prisma.evaluation.findMany({
        where: { documentId: id },
        select: { agentId: true },
      });

      const existingAgentIds = new Set(existingEvaluations.map(e => e.agentId));
      const newAgentIds = intendedAgentIds.filter((agentId: string) => !existingAgentIds.has(agentId));

      const createdEvaluations = [];
      for (const agentId of newAgentIds) {
        try {
          const result = await prisma.$transaction(async (tx) => {
            // Create the evaluation
            const evaluation = await tx.evaluation.create({
              data: {
                documentId: id,
                agentId: agentId,
              },
            });

            // Create the job
            const job = await tx.job.create({
              data: {
                evaluationId: evaluation.id,
              },
            });

            return { evaluation, job };
          });

          createdEvaluations.push({
            evaluationId: result.evaluation.id,
            agentId: agentId,
            jobId: result.job.id,
          });
        } catch (error) {
          console.error(`Failed to create evaluation for agent ${agentId}:`, error);
        }
      }

      return NextResponse.json({
        success: true,
        documentId: id,
        updatedFields: {
          intendedAgents: intendedAgentIds,
        },
        createdEvaluations: createdEvaluations,
        message: `Successfully updated document and created ${createdEvaluations.length} new evaluation(s)`,
      });
    }

    return NextResponse.json({
      success: true,
      message: "No updates provided",
    });
  } catch (error) {
    logger.error('Error updating document:', error);
    return NextResponse.json(
      { error: "Failed to update document" },
      { status: 500 }
    );
  }
}
