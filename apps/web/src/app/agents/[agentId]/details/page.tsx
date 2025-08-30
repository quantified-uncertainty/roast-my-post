import { notFound } from "next/navigation";
import { getServices } from "@/application/services/ServiceFactory";
import { auth } from "@/infrastructure/auth/auth";
import { DetailsTab } from "@/components/AgentDetail/tabs";

export default async function AgentDetailsPage({
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

  return <DetailsTab agent={agent} />;
}