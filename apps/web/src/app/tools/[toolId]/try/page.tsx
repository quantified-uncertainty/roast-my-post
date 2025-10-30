import { notFound } from 'next/navigation';
import { toolRegistry, toolSchemas, type ToolId } from '@roast/ai';
import { ToolTryPageClient } from '../../components/ToolTryPageClient';

interface ToolTryPageProps {
  params: Promise<{
    toolId: string;
  }>;
}

export default async function ToolTryPage({ params }: ToolTryPageProps) {
  const { toolId } = await params;

  // Check if tool exists
  if (!(toolId in toolRegistry)) {
    notFound();
  }

  // Check if schemas exist
  if (!(toolId in toolSchemas)) {
    notFound();
  }

  return <ToolTryPageClient toolId={toolId} />;
}
