import { notFound } from "next/navigation";

import AgentDetail from "@/components/AgentDetail";
import type { AgentPurpose } from "@/types/evaluationAgents";
import { PrismaClient } from "@prisma/client";

export default async function AgentPage({
  params,
}: {
  params: { agentId: string };
}) {
  const prisma = new PrismaClient();
  const dbAgent = await prisma.agent.findUnique({
    where: { id: params.agentId },
    include: {
      versions: {
        orderBy: {
          version: "desc",
        },
        take: 1,
      },
    },
  });

  if (!dbAgent) {
    notFound();
  }

  // Convert dbAgent to frontend Agent shape
  const agent = {
    id: dbAgent.id,
    name: dbAgent.versions[0].name,
    purpose: dbAgent.versions[0].agentType.toLowerCase() as AgentPurpose,
    version: dbAgent.versions[0].version.toString(),
    description: dbAgent.versions[0].description,
    iconName: "robot", // Default icon
    genericInstructions: dbAgent.versions[0].genericInstructions,
    summaryInstructions: dbAgent.versions[0].summaryInstructions,
    commentInstructions: dbAgent.versions[0].commentInstructions,
    gradeInstructions: dbAgent.versions[0].gradeInstructions || undefined,
  };

  return (
    <div className="min-h-screen">
      <main>
        <div className="mx-auto max-w-full">
          <AgentDetail agent={agent} />
        </div>
      </main>
    </div>
  );
}
