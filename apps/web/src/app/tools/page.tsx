/**
 * Tools Index Page
 * Lists all available experimental tools
 */

import Link from 'next/link';
import { allToolConfigs } from '@roast/ai';
import { MagnifyingGlassIcon, CpuChipIcon, CheckCircleIcon, FunnelIcon } from '@heroicons/react/24/outline';

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
  const tools = allToolConfigs;
  const toolsByCategory = tools.reduce((acc, tool) => {
    if (!acc[tool.category]) {
      acc[tool.category] = [];
    }
    acc[tool.category].push(tool);
    return acc;
  }, {} as Record<string, typeof tools>);

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Experimental Tools</h1>
        <p className="text-gray-600">
          Test and experiment with various AI-powered analysis tools. These tools are for demonstration
          and testing purposes.
        </p>
      </div>

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

                  return (
                    <Link
                      key={tool.id}
                      href={toolPath}
                      className={`block p-6 rounded-lg border-2 transition-all hover:shadow-lg ${categoryColor}`}
                    >
                      <h3 className="text-lg font-semibold mb-2">{tool.name}</h3>
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