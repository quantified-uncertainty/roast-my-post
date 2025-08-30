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
  const serviceEvaluations = evaluationsResult.isOk() ? evaluationsResult.unwrap() : [];
  
  // Convert service evaluations to component type (mainly Date to string and handle nulls)
  const evaluations = serviceEvaluations.map(serviceEval => ({
    ...serviceEval,
    createdAt: serviceEval.createdAt instanceof Date ? serviceEval.createdAt.toISOString() : String(serviceEval.createdAt),
    jobCreatedAt: serviceEval.jobCreatedAt instanceof Date 
      ? serviceEval.jobCreatedAt.toISOString() 
      : serviceEval.jobCreatedAt === null 
        ? undefined 
        : serviceEval.jobCreatedAt,
    jobCompletedAt: serviceEval.jobCompletedAt instanceof Date 
      ? serviceEval.jobCompletedAt.toISOString() 
      : serviceEval.jobCompletedAt === null 
        ? undefined 
        : serviceEval.jobCompletedAt,
    priceInDollars: typeof serviceEval.priceInDollars === 'number' ? serviceEval.priceInDollars : undefined,
  }));

  return (
    <EvalsClient 
      agent={agent} 
      agentId={resolvedParams.agentId}
      initialEvaluations={evaluations}
    />
  );
}