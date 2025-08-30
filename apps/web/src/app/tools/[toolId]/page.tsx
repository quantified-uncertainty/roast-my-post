import { redirect } from 'next/navigation';

interface ToolRedirectPageProps {
  params: Promise<{
    toolId: string;
  }>;
}

export default async function ToolRedirectPage({ params }: ToolRedirectPageProps) {
  const { toolId } = await params;
  // Redirect to the docs page by default
  redirect(`/tools/${toolId}/docs`);
}