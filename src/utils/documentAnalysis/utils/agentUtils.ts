import type { Agent } from "@/types/agentSchema";
import { AgentSchema } from "@/types/agentSchema";
import { PrismaClient } from "@prisma/client";

export async function loadAgentInfo(agentId: string): Promise<Agent> {
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

    return AgentSchema.parse({
      id: dbAgent.id,
      name: latestVersion.name,
      purpose: latestVersion.agentType,
      version: latestVersion.version.toString(),
      description: latestVersion.description,
      iconName: "robot", // Default icon
      genericInstructions: latestVersion.genericInstructions,
      summaryInstructions: latestVersion.summaryInstructions,
      commentInstructions: latestVersion.commentInstructions,
      gradeInstructions: latestVersion.gradeInstructions,
    });
  } finally {
    await prisma.$disconnect();
  }
}
