"use client";

import Link from "next/link";

import AgentDetail from "@/components/AgentDetail";
import type { AgentPurpose } from "@/types/evaluationAgents";
import { PrismaClient } from "@prisma/client";

export default async function AgentPage({
  params,
}: {
  params: { agentId: string };
}) {
  const resolvedParams = await Promise.resolve(params);
  const prisma = new PrismaClient();
  const dbAgent = await prisma.agent.findUnique({
    where: { id: resolvedParams.agentId },
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
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white p-4">
        <h1 className="mb-4 text-2xl font-bold text-gray-900">
          Agent not found
        </h1>
        <p className="mb-8 text-gray-600">
          The agent you're looking for doesn't exist or has been moved.
        </p>
        <Link
          href="/agents"
          className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Back to Agents
        </Link>
      </div>
    );
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
