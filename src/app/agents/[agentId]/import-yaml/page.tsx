import { YamlImportClient } from "./YamlImportClient";

export default async function YamlImportPage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const resolvedParams = await params;
  return <YamlImportClient agentId={resolvedParams.agentId} />;
}