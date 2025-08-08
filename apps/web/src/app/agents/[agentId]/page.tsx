import { notFound } from "next/navigation";

import AgentDetail from "@/components/AgentDetail";
import { auth } from "@/infrastructure/auth/auth";
import { getServices } from "@/application/services/ServiceFactory";

export default async function AgentPage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const resolvedParams = await params;
  const session = await auth();

  const { agentService } = getServices();
  const result = await agentService.getAgentWithOwner(
    resolvedParams.agentId,
    session?.user?.id
  );
  
  if (result.isError() || !result.unwrap()) {
    return notFound();
  }

  const agent = result.unwrap()!;
  return <AgentDetail agent={agent} isOwner={agent.isOwner} />;
}
