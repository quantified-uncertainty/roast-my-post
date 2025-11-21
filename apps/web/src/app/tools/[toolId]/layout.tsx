import { notFound } from 'next/navigation';
import { toolRegistry } from '@roast/ai';
import Link from 'next/link';
import { ChevronLeftIcon } from '@heroicons/react/24/outline';
import { BeakerIcon } from "@heroicons/react/24/outline";
import { ToolTabs } from '../components/ToolTabs';
import { ToolIcons } from '../components/ToolIcons';

// Icons for known tools are imported from a shared component map

interface ToolLayoutProps {
  params: Promise<{
    toolId: string;
  }>;
  children: React.ReactNode;
}

export default async function ToolLayout({ params, children }: ToolLayoutProps) {
  const { toolId } = await params;

  // Check if tool exists
  if (!(toolId in toolRegistry)) {
    notFound();
  }

  const toolConfig = toolRegistry[toolId];
  const icon = ToolIcons[toolId] || (
    <BeakerIcon className="h-8 w-8 text-gray-600" />
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Link href="/tools" className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-6">
          <ChevronLeftIcon className="h-4 w-4 mr-1" />
          Back to Tools
        </Link>

        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            {icon}
            <h1 className="text-3xl font-bold text-gray-900">{toolConfig.name}</h1>
          </div>
          <p className="text-gray-600">{toolConfig.description}</p>
        </div>

        {/* Tab Navigation */}
        <ToolTabs toolId={toolId} toolConfig={toolConfig} />

        {/* Content */}
        {children}
      </div>
    </div>
  );
}
