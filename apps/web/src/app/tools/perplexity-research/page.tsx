'use client';

import { LinkIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { perplexityResearchTool } from '@roast/ai';
import { GenericToolPage } from '../components/GenericToolPage';
import { relevanceColors } from '../utils/resultFormatting';
import { examples } from './examples';

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

interface ResearchInput {
  query: string;
  maxSources: number;
  focusArea: string;
}

export default function PerplexityResearchPage() {

  const renderResult = (result: ResearchResult) => {
    return (
      <div className="space-y-6">
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
    );
  };


  return (
    <GenericToolPage<ResearchInput, ResearchResult>
      toolId={perplexityResearchTool.config.id as keyof typeof import('@roast/ai').toolSchemas}
      title={perplexityResearchTool.config.name}
      description={perplexityResearchTool.config.description}
      icon={<MagnifyingGlassIcon className="h-8 w-8 text-indigo-600" />}
      fields={[
        {
          type: 'textarea',
          name: 'query',
          label: 'Research Query',
          placeholder: 'e.g., What are the latest developments in quantum computing error correction?',
          rows: 3,
          required: true,
          examples: examples
        },
        {
          type: 'select',
          name: 'focusArea',
          label: 'Focus Area',
          defaultValue: 'general',
          options: [
            { value: 'general', label: 'General Research' },
            { value: 'academic', label: 'Academic/Scientific' },
            { value: 'news', label: 'Recent News' },
            { value: 'technical', label: 'Technical Documentation' },
            { value: 'market', label: 'Market/Financial' }
          ]
        },
        {
          type: 'number',
          name: 'maxSources',
          label: 'Max Sources',
          defaultValue: 5,
          min: 3,
          max: 10,
          helperText: 'Number of sources to retrieve'
        }
      ]}
      renderResult={renderResult}
      submitButtonText="Research Query"
      loadingText="Researching..."
      validateInput={(input) => {
        if (!input.query.trim()) return 'Please enter a research query';
        return true;
      }}
    />
  );
}