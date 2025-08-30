import { notFound } from "next/navigation";
import { auth } from "@/infrastructure/auth/auth";
import { getServices } from "@/application/services/ServiceFactory";
import { DetailsTab } from "@/components/AgentDetail/tabs";

export default async function DetailsPage({
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

  return <DetailsTab agent={agent} />;
}