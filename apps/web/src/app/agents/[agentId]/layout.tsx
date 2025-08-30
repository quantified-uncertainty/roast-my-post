import { notFound } from "next/navigation";
import { auth } from "@/infrastructure/auth/auth";
import { getServices } from "@/application/services/ServiceFactory";
import { AgentDetailLayout } from "@/components/AgentDetail/Layout";

export default async function AgentLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ agentId: string }>;
}) {
  const resolvedParams = await params;
  const session = await auth();

  const { agentService } = getServices();
  const result = await agentService.getAgentWithOwner(
    resolvedParams.agentId,
    session?.user?.id
  );
  
  if (result.isError()) {
    return notFound();
  }

  const agent = result.unwrap();
  if (!agent) {
    return notFound();
  }

  const isAdmin = session?.user?.role === "ADMIN";
  const isOwner = agent.isOwner;

  return (
    <AgentDetailLayout agent={agent} isOwner={isOwner} isAdmin={isAdmin}>
      {children}
    </AgentDetailLayout>
  );
}