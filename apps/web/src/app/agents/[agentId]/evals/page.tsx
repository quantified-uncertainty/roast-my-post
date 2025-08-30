import { notFound } from "next/navigation";
import { auth } from "@/infrastructure/auth/auth";
import { getServices } from "@/application/services/ServiceFactory";
import EvalsClient from "./EvalsClient";

export default async function EvalsPage({
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

  // Fetch actual evaluations from the service
  const evaluationsResult = await agentService.getAgentEvaluations(resolvedParams.agentId);
  const evaluations = evaluationsResult.isOk() ? evaluationsResult.unwrap() : [];

  return (
    <EvalsClient 
      agent={agent} 
      agentId={resolvedParams.agentId}
      initialEvaluations={evaluations}
    />
  );
}