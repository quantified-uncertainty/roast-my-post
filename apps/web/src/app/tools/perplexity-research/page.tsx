'use client';

import { useState } from 'react';
import { LinkIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { perplexityResearchTool, toolSchemas, getToolReadme } from '@roast/ai';
import { TabbedToolPageLayout } from '../components/TabbedToolPageLayout';
import { ToolDocumentation } from '../components/ToolDocumentation';

interface ResearchResult {
  query: string;
  summary: string;
  sources: Array<{
    title: string;
    url: string;
    snippet: string;
    relevance: 'high' | 'medium' | 'low';
  }>;
  keyFindings: string[];
  timestamp: string;
}

export default function PerplexityResearchPage() {
  const [query, setQuery] = useState('');
  const [maxSources, setMaxSources] = useState(5);
  const [focusArea, setFocusArea] = useState('general');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ResearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Get schemas from centralized registry
  const { inputSchema, outputSchema } = toolSchemas[perplexityResearchTool.config.id as keyof typeof toolSchemas];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/tools/perplexity-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, maxSources, focusArea }),
      });

      if (!response.ok) {
        throw new Error(`Failed: ${response.statusText}`);
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const relevanceColors = {
    high: 'bg-green-100 text-green-800 border-green-200',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    low: 'bg-gray-100 text-gray-800 border-gray-200'
  };

  // Try tab content (form and results)
  const tryContent = (
    <div className="space-y-6">

      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow-sm border">
        <div>
          <label htmlFor="query" className="block text-sm font-medium text-gray-700 mb-1">
            Research Query <span className="text-red-500">*</span>
          </label>
          <textarea
            id="query"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            rows={3}
            placeholder="e.g., What are the latest developments in quantum computing error correction?"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="focusArea" className="block text-sm font-medium text-gray-700 mb-1">
              Focus Area
            </label>
            <select
              id="focusArea"
              value={focusArea}
              onChange={(e) => setFocusArea(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="general">General Research</option>
              <option value="academic">Academic/Scientific</option>
              <option value="news">Recent News</option>
              <option value="technical">Technical Documentation</option>
              <option value="market">Market/Financial</option>
            </select>
          </div>

          <div>
            <label htmlFor="maxSources" className="block text-sm font-medium text-gray-700 mb-1">
              Max Sources
            </label>
            <input
              type="number"
              id="maxSources"
              value={maxSources}
              onChange={(e) => setMaxSources(parseInt(e.target.value) || 5)}
              min={3}
              max={10}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-xs text-gray-500 mt-1">Number of sources to retrieve</p>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading || !query.trim()}
          className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Researching...' : 'Research Query'}
        </button>
      </form>

      {error && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-800">Error: {error}</p>
        </div>
      )}

      {result && (
        <div className="mt-8 space-y-6">
          <div className="bg-indigo-50 p-6 rounded-lg border border-indigo-200">
            <h2 className="text-xl font-semibold text-indigo-900 mb-3">Summary</h2>
            <p className="text-gray-700">{result.summary}</p>
          </div>

          {result.keyFindings && result.keyFindings.length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="text-lg font-semibold mb-3">Key Findings</h3>
              <ul className="space-y-2">
                {result.keyFindings.map((finding, i) => (
                  <li key={i} className="flex items-start">
                    <span className="text-indigo-600 mr-2">•</span>
                    <span className="text-gray-700">{finding}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold mb-4">Sources ({result.sources.length})</h3>
            <div className="space-y-4">
              {result.sources.map((source, i) => (
                <div
                  key={i}
                  className={`p-4 rounded-lg border ${
                    relevanceColors[source.relevance]
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium flex items-center">
                      <LinkIcon className="h-4 w-4 mr-2" />
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline"
                      >
                        {source.title}
                      </a>
                    </h4>
                    <span className="text-xs font-medium capitalize">
                      {source.relevance} relevance
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">{source.snippet}</p>
                  <p className="text-xs text-gray-500 mt-2">{source.url}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="text-center text-sm text-gray-500">
            Research completed at {new Date(result.timestamp).toLocaleString()}
          </div>
        </div>
      )}
      
    </div>
  );

  // Load README content from generated file
  const readmeContent = getToolReadme(perplexityResearchTool.config.id as any);

  // Docs tab content
  const docsContent = (
    <ToolDocumentation 
      toolId={perplexityResearchTool.config.id}
      inputSchema={inputSchema}
      outputSchema={outputSchema}
      readmeContent={readmeContent}
    />
  );

  return (
    <TabbedToolPageLayout
      title={perplexityResearchTool.config.name}
      description={perplexityResearchTool.config.description}
      icon={<MagnifyingGlassIcon className="h-8 w-8 text-indigo-600" />}
      tryContent={tryContent}
      docsContent={docsContent}
    />
  );
}