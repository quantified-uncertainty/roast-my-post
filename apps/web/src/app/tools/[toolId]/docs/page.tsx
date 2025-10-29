import { notFound } from 'next/navigation';
import { toolRegistry, toolSchemas, type ToolId } from '@roast/ai';
import { GenericToolDocsPage } from '../../components/DocsPage';

interface ToolDocsPageProps {
  params: Promise<{
    toolId: string;
  }>;
}

export default async function ToolDocsPage({ params }: ToolDocsPageProps) {
  const { toolId } = await params;

  // Check if tool exists
  if (!(toolId in toolRegistry)) {
    notFound();
  }

  // Check if schemas exist
  if (!(toolId in toolSchemas)) {
    notFound();
  }

  return <GenericToolDocsPage toolId={toolId as ToolId} />;
}
