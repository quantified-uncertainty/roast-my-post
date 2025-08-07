import { prisma } from "@/infrastructure/database/prisma";
import { logger } from "@/infrastructure/logging/logger";

export async function updateDocumentWithAgents(
  documentId: string, 
  intendedAgentIds: string[], 
  userId: string
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

  const createdEvaluations = [];
  for (const agentId of newAgentIds) {
    try {
      const result = await prisma.$transaction(async (tx) => {
        // Create the evaluation
        const evaluation = await tx.evaluation.create({
          data: {
            documentId,
            agentId: agentId,
          },
        });

        // Create the job using JobService for consistency
        const { getServices } = await import("@/application/services/ServiceFactory");
        const transactionalServices = getServices().createTransactionalServices(tx);
        const job = await transactionalServices.jobService.createJob({
          evaluationId: evaluation.id,
        });

        return { evaluation, job };
      });

      createdEvaluations.push({
        evaluationId: result.evaluation.id,
        agentId: agentId,
        jobId: result.job.id,
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