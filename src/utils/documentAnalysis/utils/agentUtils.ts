import { PrismaClient } from "@prisma/client";

import { EvaluationAgent } from "../../../types/evaluationAgents";

export async function loadAgentInfo(agentId: string): Promise<EvaluationAgent> {
  const prisma = new PrismaClient();
  try {
    const dbAgent = await prisma.agent.findUnique({
      where: { id: agentId },
      include: {
        versions: {
          orderBy: {
            version: "desc",
          },
          take: 1,
        },
      },
    });

    if (!dbAgent || !dbAgent.versions[0]) {
      throw new Error(`Agent info not found for ID: ${agentId}`);
    }

    const latestVersion = dbAgent.versions[0];

    return {
      id: dbAgent.id,
      name: latestVersion.name,
      purpose: latestVersion.agentType.toLowerCase() as any, // TODO: Fix type
      version: latestVersion.version.toString(),
      description: latestVersion.description,
      iconName: "robot", // Default icon
      genericInstructions: latestVersion.genericInstructions,
      summaryInstructions: latestVersion.summaryInstructions,
      commentInstructions: latestVersion.commentInstructions,
      gradeInstructions: latestVersion.gradeInstructions || undefined,
    };
  } finally {
    await prisma.$disconnect();
  }
}
