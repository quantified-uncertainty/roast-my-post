import { redirect } from "next/navigation";
import { auth } from "@/infrastructure/auth/auth";
import { getServices } from "@/application/services/ServiceFactory";
import { ExportTab } from "@/components/AgentDetail/tabs";

export default async function AgentExportPage({
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

  // TODO: Fetch batches
  const batches: any[] = [];

  return <ExportTab 
    agent={agent} 
    exportBatchFilter={null}
    setExportBatchFilter={() => {}}
    batches={batches}
  />;
}