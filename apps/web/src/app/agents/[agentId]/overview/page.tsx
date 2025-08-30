import { notFound } from "next/navigation";
import { auth } from "@/infrastructure/auth/auth";
import { getServices } from "@/application/services/ServiceFactory";
import { OverviewTab } from "@/components/AgentDetail/tabs";

export default async function OverviewPage({
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
  
  if (result.isError()) {
    return notFound();
  }

  const agent = result.unwrap();
  if (!agent) {
    return notFound();
  }

  // For now, we'll pass null for overview stats since we don't have that endpoint yet
  const overviewStats = null;
  const overviewLoading = false;

  return (
    <OverviewTab
      agent={agent}
      overviewStats={overviewStats}
      overviewLoading={overviewLoading}
    />
  );
}