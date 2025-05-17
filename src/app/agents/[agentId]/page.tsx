import { notFound } from "next/navigation";

import AgentDetail from "@/components/AgentDetail";
import { auth } from "@/lib/auth";
import { AgentModel } from "@/models/Agent";

interface AgentPageProps {
  params: {
    agentId: string;
  };
}

export default async function AgentPage({ params }: AgentPageProps) {
  const session = await auth();
  if (!session?.user) {
    return notFound();
  }

  const agent = await AgentModel.getAgentWithOwner(
    params.agentId,
    session.user.id
  );
  if (!agent) {
    return notFound();
  }

  return <AgentDetail agent={agent} isOwner={agent.isOwner} />;
}
