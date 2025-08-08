import { notFound } from "next/navigation";

import { auth } from "@/infrastructure/auth/auth";
import { getServices } from "@/application/services/ServiceFactory";

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

  const { agentService } = getServices();
  
  const agentResult = await agentService.getAgentWithOwner(
    resolvedParams.agentId,
    session.user.id
  );

  if (agentResult.isError()) {
    return notFound();
  }

  const agent = agentResult.unwrap();
  if (!agent) {
    return notFound();
  }

  // Get agent versions
  const versionsResult = await agentService.getAgentVersions(resolvedParams.agentId);
  
  if (versionsResult.isError()) {
    return notFound();
  }

  const versions = versionsResult.unwrap();

  return (
    <AgentVersionsClient
      agent={agent}
      versions={versions}
      isOwner={agent.isOwner}
    />
  );
}
