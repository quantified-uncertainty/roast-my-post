/**
 * Tools Index Page
 * Lists all available experimental tools
 */

import Link from 'next/link';
import { toolRegistry } from '@/tools/registry';
import { BeakerIcon, ChartBarIcon, MagnifyingGlassIcon, CpuChipIcon } from '@heroicons/react/24/outline';

const categoryIcons = {
  analysis: MagnifyingGlassIcon,
  research: MagnifyingGlassIcon,
  utility: CpuChipIcon
};

const categoryColors = {
  analysis: 'bg-green-50 text-green-700 border-green-200',
  research: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  utility: 'bg-purple-50 text-purple-700 border-purple-200'
};

const statusColors = {
  stable: 'bg-green-100 text-green-800',
  beta: 'bg-yellow-100 text-yellow-800',
  experimental: 'bg-red-100 text-red-800'
};

export default function ToolsIndexPage() {
  const tools = toolRegistry.getMetadata();
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
          const Icon = categoryIcons[category as keyof typeof categoryIcons];
          const categoryColor = categoryColors[category as keyof typeof categoryColors];
          
          return (
            <div key={category} className="space-y-4">
              <div className="flex items-center gap-2">
                <Icon className="h-6 w-6 text-gray-600" />
                <h2 className="text-xl font-semibold capitalize">{category}</h2>
              </div>
              
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {categoryTools.map(tool => {
                  const toolPath = tool.path || `/tools/${tool.id}`;
                  const toolStatus = tool.status || 'experimental';
                  
                  return (
                    <Link
                      key={tool.id}
                      href={toolPath}
                      className={`block p-6 rounded-lg border-2 transition-all hover:shadow-lg ${categoryColor}`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-lg font-semibold">{tool.name}</h3>
                        <span className={`text-xs px-2 py-1 rounded-full ${statusColors[toolStatus]}`}>
                          {toolStatus}
                        </span>
                      </div>
                      <p className="text-sm opacity-90">{tool.description}</p>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-12 space-y-4">
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">🚀 Auto-Generated Forms Available!</h3>
          <p className="text-sm text-blue-800 mb-3">
            We've implemented auto-generated forms from Zod schemas. Try these new versions:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-blue-900 uppercase tracking-wide">Analysis Tools</h4>
              <Link
                href="/tools/math-checker-auto"
                className="block text-sm bg-white px-3 py-2 rounded border border-blue-300 text-blue-700 hover:bg-blue-50 transition-colors"
              >
                ✨ Math Checker (Auto)
              </Link>
              <Link
                href="/tools/forecaster-auto"
                className="block text-sm bg-white px-3 py-2 rounded border border-blue-300 text-blue-700 hover:bg-blue-50 transition-colors"
              >
                ✨ Simple Forecaster (Auto)
              </Link>
              <Link
                href="/tools/fact-check-auto"
                className="block text-sm bg-white px-3 py-2 rounded border border-blue-300 text-blue-700 hover:bg-blue-50 transition-colors"
              >
                ✨ Fact Checker (Auto)
              </Link>
              <Link
                href="/tools/check-spelling-grammar-auto"
                className="block text-sm bg-white px-3 py-2 rounded border border-blue-300 text-blue-700 hover:bg-blue-50 transition-colors"
              >
                ✨ Spelling & Grammar (Auto)
              </Link>
            </div>
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-blue-900 uppercase tracking-wide">Extraction & Research</h4>
              <Link
                href="/tools/extract-forecasting-claims-auto"
                className="block text-sm bg-white px-3 py-2 rounded border border-blue-300 text-blue-700 hover:bg-blue-50 transition-colors"
              >
                ✨ Extract Forecasting Claims (Auto)
              </Link>
              <Link
                href="/tools/extract-factual-claims-auto"
                className="block text-sm bg-white px-3 py-2 rounded border border-blue-300 text-blue-700 hover:bg-blue-50 transition-colors"
              >
                ✨ Extract Factual Claims (Auto)
              </Link>
              <Link
                href="/tools/perplexity-research-auto"
                className="block text-sm bg-white px-3 py-2 rounded border border-blue-300 text-blue-700 hover:bg-blue-50 transition-colors"
              >
                ✨ Perplexity Research (Auto)
              </Link>
            </div>
          </div>
          <p className="text-xs text-blue-700 mt-4">
            These auto-generated versions use the same API endpoints but with cleaner, consistent UI.
          </p>
        </div>
        
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