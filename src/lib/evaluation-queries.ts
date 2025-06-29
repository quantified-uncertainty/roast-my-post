import { prisma } from "@/lib/prisma";
import { documentWithEvaluationsInclude, fullEvaluationInclude } from "./prisma-fragments";

/**
 * Fetches evaluation data with all necessary includes for sidebar display
 * This ensures grade data is always included
 */
export async function getEvaluationWithSidebarData(docId: string, agentId: string) {
  return prisma.evaluation.findFirst({
    where: {
      documentId: docId,
      agentId: agentId,
    },
    include: fullEvaluationInclude,
  });
}

/**
 * Type-safe evaluation data with grades
 */
export type EvaluationWithSidebarData = NonNullable<
  Awaited<ReturnType<typeof getEvaluationWithSidebarData>>
>;