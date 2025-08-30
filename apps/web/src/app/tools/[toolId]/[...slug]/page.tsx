import { notFound } from 'next/navigation';
import { toolRegistry } from '@roast/ai';
import { ToolPageClient } from './ToolPageClient';


interface ToolPageProps {
  params: Promise<{
    toolId: string;
    slug: string[];
  }>;
}

export default async function ToolPage({ params }: ToolPageProps) {
  const { toolId, slug } = await params;
  
  // Check if tool exists in registry
  if (toolId === 'getMetadata' || !(toolId in toolRegistry)) {
    notFound();
  }
  
  return <ToolPageClient toolId={toolId} slug={slug} />;
}