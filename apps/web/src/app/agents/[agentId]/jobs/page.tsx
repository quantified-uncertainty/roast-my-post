import { redirect } from "next/navigation";
import { auth } from "@/infrastructure/auth/auth";
import { getServices } from "@/application/services/ServiceFactory";

export default async function AgentJobsPage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const resolvedParams = await params;
  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN";

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

  // Redirect if not authorized
  if (!isOwner && !isAdmin) {
    redirect(`/agents/${resolvedParams.agentId}`);
  }

  return <div>Jobs page - needs implementation</div>;
}