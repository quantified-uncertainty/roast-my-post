import { prisma } from "@/lib/prisma";
import { fullEvaluationInclude } from "@/lib/prisma/evaluation-includes";

/**
 * Shared query pattern for getting evaluation data for display
 */
export async function getEvaluationForDisplay(docId: string, agentId: string) {
  const evaluation = await prisma.evaluation.findFirst({
    where: {
      agentId: agentId,
      documentId: docId,
    },
    include: {
      ...fullEvaluationInclude,
      agent: {
        include: {
          ...fullEvaluationInclude.agent.include,
          ephemeralBatch: {
            select: {
              trackingId: true,
              isEphemeral: true,
            },
          },
        },
      },
    },
  });

  return evaluation;
}


/**
 * Extract evaluation display data from a full evaluation object
 */
export function extractEvaluationDisplayData(evaluation: NonNullable<Awaited<ReturnType<typeof getEvaluationForDisplay>>>) {
  const latestVersion = evaluation.versions[0];
  
  return {
    // Core evaluation data
    summary: latestVersion?.summary || undefined,
    analysis: latestVersion?.analysis || "",
    thinking: latestVersion?.job?.llmThinking || undefined,
    selfCritique: latestVersion?.selfCritique || undefined,
    comments: latestVersion?.comments || [],
    
    // Agent information
    agentName: evaluation.agent.versions[0]?.name || "Unknown Agent",
    agentDescription: evaluation.agent.versions[0]?.description || undefined,
    grade: latestVersion?.grade,
    ephemeralBatch: evaluation.agent.ephemeralBatch && evaluation.agent.ephemeralBatch.trackingId 
      ? evaluation.agent.ephemeralBatch 
      : null,
    
    // Run stats
    costInCents: latestVersion?.job?.costInCents,
    durationInSeconds: latestVersion?.job?.durationInSeconds,
    createdAt: latestVersion?.createdAt || new Date(),
    
    // State
    isStale: latestVersion?.isStale || false,
    
    // Document info
    documentTitle: evaluation.document.versions[0]?.title || "Untitled Document",
    documentId: evaluation.document.id,
    agentId: evaluation.agent.id,
    
    // Additional metadata
    version: latestVersion?.version || 1,
    evaluationId: evaluation.id,
    allEvaluations: evaluation.document.evaluations || [],
  };
}


/**
 * Simplified query for getting basic evaluation data (for lists, etc.)
 */
export async function getEvaluationBasic(docId: string, agentId: string) {
  const evaluation = await prisma.evaluation.findFirst({
    where: {
      agentId: agentId,
      documentId: docId,
    },
    include: {
      agent: {
        include: {
          versions: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      },
      document: {
        include: {
          versions: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      },
      versions: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: {
          job: {
            select: {
              costInCents: true,
              durationInSeconds: true,
            },
          },
        },
      },
    },
  });

  return evaluation;
}