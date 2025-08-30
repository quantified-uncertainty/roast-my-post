import { notFound } from "next/navigation";
import { getServices } from "@/application/services/ServiceFactory";
import { auth } from "@/infrastructure/auth/auth";
import { OverviewTab } from "@/components/AgentDetail/tabs";

export default async function AgentOverviewPage({
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
    return notFound();
  }
  
  // TODO: Fetch overview stats
  const overviewStats = null;
  const overviewLoading = false;

  return <OverviewTab agent={agent} overviewStats={overviewStats} overviewLoading={overviewLoading} />;
}
