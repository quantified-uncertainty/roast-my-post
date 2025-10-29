import { notFound } from 'next/navigation';
import { toolRegistry } from '@roast/ai';
import { ToolPageClient } from '../ToolPageClient';


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

  return <ToolPageClient toolId={toolId} pageType="try" />;
}

