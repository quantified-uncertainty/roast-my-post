import { redirect } from "next/navigation";
import { auth } from "@/infrastructure/auth/auth";
import { getServices } from "@/application/services/ServiceFactory";

export default async function AgentBatchesPage({
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
  
  const agent = result.unwrap();
  
  if (!agent) {
    redirect(`/agents/${resolvedParams.agentId}`);
  }
  
  const isOwner = agent.isOwner || false;

  // Redirect if not owner
  if (!isOwner) {
    redirect(`/agents/${resolvedParams.agentId}`);
  }

  return <div>Batches page - needs implementation</div>;
}