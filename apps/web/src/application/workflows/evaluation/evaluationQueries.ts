import { prisma } from "@/infrastructure/database/prisma";
import { fullEvaluationInclude } from "@/infrastructure/database/prisma/evaluation-includes";
import { serializePrismaResult, decimalToNumber } from "@/infrastructure/database/prisma-serializers";

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
    logs: latestVersion?.job?.logs || undefined,
    comments: latestVersion?.comments || [],
    
    // Agent information
    agentName: evaluation.agent.versions[0]?.name || "Unknown Agent",
    agentDescription: evaluation.agent.versions[0]?.description || undefined,
    grade: latestVersion?.grade,
    ephemeralBatch: evaluation.agent.ephemeralBatch && evaluation.agent.ephemeralBatch.trackingId 
      ? evaluation.agent.ephemeralBatch 
      : null,
    
    // Run stats
    priceInDollars: latestVersion?.job?.priceInDollars ? decimalToNumber(latestVersion.job.priceInDollars) ?? undefined : undefined,
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
    allEvaluations: (evaluation.document.evaluations || []).map(ev => ({
      id: ev.id,
      agentId: ev.agentId,
      agent: ev.agent ? {
        name: ev.agent.versions?.[0]?.name,
        versions: ev.agent.versions?.map(v => ({
          name: v.name,
        })),
      } : undefined,
      versions: ev.versions?.map(v => ({
        grade: v.grade,
        job: v.job ? {
          status: v.job.status,
        } : null,
      })),
      jobs: ev.jobs?.map(j => ({
        status: j.status,
      })),
      grade: ev.versions?.[0]?.grade ?? null,
    })),
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
              priceInDollars: true,
              durationInSeconds: true,
            },
          },
        },
      },
    },
  });

  return evaluation;
}