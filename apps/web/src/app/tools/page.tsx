/**
 * Tools Index Page
 * Lists all available experimental tools
 */
'use client';

import Link from 'next/link';
import { allToolConfigs } from '@roast/ai';
import { MagnifyingGlassIcon, CpuChipIcon, CheckCircleIcon, FunnelIcon, LockClosedIcon } from '@heroicons/react/24/outline';
import { useSession } from 'next-auth/react';

const categoryIcons = {
  extraction: FunnelIcon,
  checker: CheckCircleIcon,
  research: MagnifyingGlassIcon,
  utility: CpuChipIcon
};

const categoryColors = {
  extraction: 'bg-green-50 text-green-700 border-green-200',
  checker: 'bg-blue-50 text-blue-700 border-blue-200',
  research: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  utility: 'bg-purple-50 text-purple-700 border-purple-200'
};

export default function ToolsIndexPage() {
  const { data: session, status } = useSession();
  const isLoading = status === 'loading';
  const isAuthenticated = !!session?.user;

  const tools = allToolConfigs;
  const toolsByCategory = tools.reduce((acc, tool) => {
    if (!acc[tool.category]) {
      acc[tool.category] = [];
    }
    acc[tool.category].push(tool);
    return acc;
  }, {} as Record<string, typeof tools>);

  // Count how many tools require auth
  const authRequiredCount = tools.filter(tool => tool.requiresAuth !== false).length;
  const showAuthBanner = !isAuthenticated && !isLoading && authRequiredCount > 0;

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Experimental Tools</h1>
        <p className="text-gray-600">
          Test and experiment with various AI-powered analysis tools. These tools are for demonstration
          and testing purposes.
        </p>
      </div>

      {/* Auth Banner for Unauthenticated Users */}
      {showAuthBanner && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
          <LockClosedIcon className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-blue-900">
              <strong>Sign in required:</strong> Most AI-powered tools require authentication to use. 
              You can still review how each tool works, but tools marked with a <LockClosedIcon className="h-4 w-4 inline mx-1" /> icon require you to{' '}
              <Link href="/api/auth/signin" className="underline font-medium hover:text-blue-700">
                sign in
              </Link>{' '}
              before you can try them.
            </p>
          </div>
        </div>
      )}

      <div className="space-y-8">
        {Object.entries(toolsByCategory).map(([category, categoryTools]) => {
          const Icon = categoryIcons[category as keyof typeof categoryIcons] || MagnifyingGlassIcon;
          const categoryColor = categoryColors[category as keyof typeof categoryColors] || 'bg-gray-50 text-gray-700 border-gray-200';

          return (
            <div key={category} className="space-y-4">
              <div className="flex items-center gap-2">
                <Icon className="h-6 w-6 text-gray-600" />
                <h2 className="text-xl font-semibold capitalize">{category}</h2>
              </div>
              
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {categoryTools.map(tool => {
                  // Link to docs page by default
                  const toolPath = `/tools/${tool.id}/docs`;
                  const requiresAuth = tool.requiresAuth !== false; // Default to true if not specified
                  const showLock = requiresAuth && !isAuthenticated && !isLoading;

                  return (
                    <Link
                      key={tool.id}
                      href={toolPath}
                      className={`block p-6 rounded-lg border-2 transition-all hover:shadow-lg ${categoryColor} relative`}
                    >
                      {showLock && (
                        <div className="absolute top-4 right-4">
                          <LockClosedIcon className="h-5 w-5 opacity-60" />
                        </div>
                      )}
                      <h3 className="text-lg font-semibold mb-2 pr-8">{tool.name}</h3>
                      <p className="text-sm opacity-90">{tool.description}</p>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-12">
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-800">
            <strong>Note:</strong> These tools are experimental and may produce varying results. 
            API costs apply for LLM calls. Use responsibly.
          </p>
        </div>
      </div>
    </div>
  );
}