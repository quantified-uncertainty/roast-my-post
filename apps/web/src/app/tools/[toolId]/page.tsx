import { redirect } from 'next/navigation';

interface ToolRedirectPageProps {
  params: {
    toolId: string;
  };
}

export default function ToolRedirectPage({ params }: ToolRedirectPageProps) {
  // Redirect to the docs page by default
  redirect(`/tools/${params.toolId}/docs`);
}