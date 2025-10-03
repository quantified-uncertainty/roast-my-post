import AgentsList from "@/components/AgentsList";
import { PageLayout } from "@/components/PageLayout";
import { auth } from "@/infrastructure/auth/auth";
import { prisma } from "@/infrastructure/database/prisma";
import { sortAgentsByBadgeStatus } from "@/shared/utils/agentSorting";

export const dynamic = "force-dynamic";

export default async function AgentsPage() {
  const session = await auth();

  let agents: any[] = [];

  try {
    const dbAgents = await prisma.agent.findMany({
      where: {
        ephemeralBatchId: null, // Exclude ephemeral agents
      },
      take: 100, // Reasonable limit for agents list
      include: {
        versions: {
          orderBy: {
            version: "desc",
          },
          take: 1,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Convert dbAgents to frontend Agent shape
    agents = dbAgents.map((dbAgent) => {
      const latestVersion = dbAgent.versions[0];
      return {
        id: dbAgent.id,
        name: latestVersion.name,
        version: latestVersion.version.toString(),
        description: latestVersion.description,
        primaryInstructions: latestVersion.primaryInstructions || undefined,
        extendedCapabilityId: latestVersion.extendedCapabilityId || undefined,
        providesGrades: latestVersion.providesGrades || false,
        isSystemManaged: dbAgent.isSystemManaged,
        isRecommended: dbAgent.isRecommended,
        isDeprecated: dbAgent.isDeprecated,
      };
    });
  } catch (error: any) {
    // Handle missing table error gracefully for preview deployments
    console.error("Failed to fetch agents:", error);
    // Return empty array if table doesn't exist
    if (error?.code === "P2021") {
      console.log(
        "Agent table not found - likely a preview deployment with fresh database"
      );
    }
  }

  // Sort agents: recommended first, then regular, then deprecated
  const sortedAgents = sortAgentsByBadgeStatus(agents);

  return (
    <PageLayout>
      <AgentsList agents={sortedAgents} />
    </PageLayout>
  );
}
