import { redirect } from "next/navigation";
import { auth } from "@/infrastructure/auth/auth";
import { getServices } from "@/application/services/ServiceFactory";

export default async function AgentTestPage({
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
  const isOwner = agent?.isOwner || false;

  // Redirect if not owner
  if (!isOwner) {
    redirect(`/agents/${resolvedParams.agentId}`);
  }

  return <div>Test page - needs implementation</div>;
}