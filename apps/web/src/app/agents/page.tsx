import AgentsList from "@/components/AgentsList";
import { prisma } from "@/infrastructure/database/prisma";
import { PageLayout } from "@/components/PageLayout";
import { sortAgentsByBadgeStatus } from "@/shared/utils/agentSorting";
import { auth } from "@/infrastructure/auth/auth";

export const dynamic = 'force-dynamic';

export default async function AgentsPage() {
  const session = await auth();
  
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
  const agents = dbAgents.map((dbAgent) => {
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

  // Sort agents: recommended first, then regular, then deprecated
  const sortedAgents = sortAgentsByBadgeStatus(agents);

  return (
    <PageLayout>
      <AgentsList agents={sortedAgents} showNewAgentButton={!!session?.user?.id} />
    </PageLayout>
  );
}
