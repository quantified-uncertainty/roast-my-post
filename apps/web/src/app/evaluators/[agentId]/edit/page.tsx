import EditAgentForm from "./EditAgentForm";

export default async function EditAgentPage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const resolvedParams = await params;
  return <EditAgentForm agentId={resolvedParams.agentId} />;
}
