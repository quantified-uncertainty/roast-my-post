import { notFound } from "next/navigation";
import { auth } from "@/infrastructure/auth/auth";
import { getServices } from "@/application/services/ServiceFactory";
import { serializeEvaluationForClient } from "@/infrastructure/database/prisma-serializers-client";
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

  // Fetch actual evaluations from the service (pass user ID for privacy filtering)
  const evaluationsResult = await agentService.getAgentEvaluations(
    resolvedParams.agentId,
    { requestingUserId: session?.user?.id }
  );
  const serviceEvaluations = evaluationsResult.isOk() ? evaluationsResult.unwrap() : [];
  
  // Serialize evaluations for client components (handles Decimal conversion)
  const evaluations = serviceEvaluations.map(serviceEval => serializeEvaluationForClient(serviceEval));

  return (
    <EvalsClient 
      agent={agent} 
      agentId={resolvedParams.agentId}
      initialEvaluations={evaluations}
    />
  );
}