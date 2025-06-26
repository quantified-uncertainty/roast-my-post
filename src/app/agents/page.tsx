import Link from "next/link";

import AgentsList from "@/components/AgentsList";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export default async function AgentsPage() {
  const dbAgents = await prisma.agent.findMany({
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
  const agents = dbAgents.map((dbAgent) => ({
    id: dbAgent.id,
    name: dbAgent.versions[0].name,
    purpose: dbAgent.versions[0].agentType,
    version: dbAgent.versions[0].version.toString(),
    description: dbAgent.versions[0].description,
    primaryInstructions: dbAgent.versions[0].primaryInstructions || undefined,
    extendedCapabilityId: dbAgent.versions[0].extendedCapabilityId || undefined,
    providesGrades: dbAgent.versions[0].providesGrades || false,
  }));

  return (
    <div className="space-y-8">
      <div className="flex justify-end">
        <Link
          href="/agents/new"
          className="inline-flex items-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          New Agent
        </Link>
      </div>
      <AgentsList agents={agents} />
    </div>
  );
}
