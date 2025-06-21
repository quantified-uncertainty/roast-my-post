import { ImportAgentClient } from "./ImportAgentClient";

export default async function ImportAgentPage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const resolvedParams = await params;
  return <ImportAgentClient agentId={resolvedParams.agentId} />;
}