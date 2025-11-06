import { prisma } from "@/infrastructure/database/prisma";
import { logger } from "@/infrastructure/logging/logger";
import { getServices } from "@/application/services/ServiceFactory";

export async function updateDocumentWithAgents(
  documentId: string, 
  intendedAgentIds: string[], 
  _userId: string
) {
  // Verify document exists
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    include: {
      versions: {
        orderBy: { version: "desc" },
        take: 1,
      },
    },
  });

  if (!document) {
    throw new Error("Document not found");
  }

  const latestVersion = document.versions[0];
  if (!latestVersion) {
    throw new Error("Document has no versions");
  }

  // Update intended agents
  await prisma.documentVersion.update({
    where: { id: latestVersion.id },
    data: {
      intendedAgents: intendedAgentIds,
    },
  });

  // Create evaluations and jobs for additional agents
  const existingEvaluations = await prisma.evaluation.findMany({
    where: { documentId },
    select: { agentId: true },
  });

  const existingAgentIds = new Set(existingEvaluations.map(e => e.agentId));
  const newAgentIds = intendedAgentIds.filter(agentId => !existingAgentIds.has(agentId));

  // Use EvaluationService for proper transaction handling
  const { evaluationService } = getServices();

  const createdEvaluations = [];
  for (const agentId of newAgentIds) {
    try {
      const result = await evaluationService.createEvaluation({
        documentId,
        agentId,
        userId: _userId
      });

      if (result.isError()) {
        logger.error(`Failed to create evaluation for agent ${agentId}:`, result.error());
        continue;
      }

      const evaluationResult = result.unwrap();
      createdEvaluations.push({
        evaluationId: evaluationResult.evaluationId,
        agentId: agentId,
        jobId: evaluationResult.jobId,
      });
    } catch (error) {
      logger.error(`Failed to create evaluation for agent ${agentId}:`, error);
    }
  }

  return {
    success: true,
    documentId,
    updatedFields: {
      intendedAgents: intendedAgentIds,
    },
    createdEvaluations,
    message: `Successfully updated document and created ${createdEvaluations.length} new evaluation(s)`,
  };
}