import { notFound } from "next/navigation";
import { auth } from "@/infrastructure/auth/auth";
import { getServices } from "@/application/services/ServiceFactory";
import AgentVersionsClient from "./AgentVersionsClient";

export default async function VersionsPage({
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

  // Fetch all versions of the agent using the service
  const versionsResult = await agentService.getAgentVersions(resolvedParams.agentId);
  const versions = versionsResult.isOk() ? versionsResult.unwrap() : [];
  const sortedVersions = [...versions].sort((a, b) => b.version - a.version);

  const isOwner = agent.isOwner || false;

  return (
    <AgentVersionsClient 
      agent={agent} 
      versions={sortedVersions} 
      isOwner={isOwner}
    />
  );
}