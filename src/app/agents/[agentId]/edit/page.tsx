import { EditAgentClient } from "./EditAgentClient";

export default async function EditAgentPage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const resolvedParams = await params;
  return <EditAgentClient agentId={resolvedParams.agentId} />;
}
