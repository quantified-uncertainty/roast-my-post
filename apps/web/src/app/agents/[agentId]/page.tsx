import { notFound } from "next/navigation";

import AgentDetail from "@/components/AgentDetail";
import { auth } from "@/infrastructure/auth/auth";
import { AgentModel } from "@/models/Agent";

export default async function AgentPage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const resolvedParams = await params;
  const session = await auth();

  const agent = await AgentModel.getAgentWithOwner(
    resolvedParams.agentId,
    session?.user?.id
  );
  if (!agent) {
    return notFound();
  }

  return <AgentDetail agent={agent} isOwner={agent.isOwner} />;
}
