import { redirect } from "next/navigation";

export default async function AgentPage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const resolvedParams = await params;
  
  // Redirect to the overview tab by default
  redirect(`/agents/${resolvedParams.agentId}/overview`);
}
