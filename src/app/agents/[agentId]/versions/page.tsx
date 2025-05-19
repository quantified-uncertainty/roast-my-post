import { notFound } from "next/navigation";

import { auth } from "@/lib/auth";
import { AgentModel } from "@/models/Agent";

import AgentVersionsClient from "./AgentVersionsClient";

export default async function AgentVersionsPage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const resolvedParams = await params;
  const session = await auth();
  if (!session?.user) {
    return notFound();
  }

  const agent = await AgentModel.getAgentWithOwner(
    resolvedParams.agentId,
    session.user.id
  );

  if (!agent) {
    return notFound();
  }

  // Get agent versions
  const versions = await AgentModel.getAgentVersions(resolvedParams.agentId);

  return (
    <AgentVersionsClient
      agent={agent}
      versions={versions}
      isOwner={agent.isOwner}
    />
  );
}
