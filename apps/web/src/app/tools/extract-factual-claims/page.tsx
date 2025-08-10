'use client';

import { useState } from 'react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { extractFactualClaimsTool, toolSchemas, getToolReadme } from '@roast/ai';
import { TabbedToolPageLayout } from '../components/TabbedToolPageLayout';
import { ToolDocumentation } from '../components/ToolDocumentation';
import { runToolWithAuth } from '../utils/runToolWithAuth';
import { ErrorDisplay, SubmitButton, TextAreaField } from '../components/common';

interface ExtractFactualClaimsResult {
  claims: Array<{
    claim: string;
    type: 'factual' | 'statistical' | 'historical' | 'scientific' | 'other';
    confidence: number;
    context?: string;
    verifiable: boolean;
  }>;
  metadata?: {
    totalClaims: number;
    processingTime?: number;
  };
  llmInteraction?: any;
}

function renderResult(result: ExtractFactualClaimsResult) {
  if (!result.claims || result.claims.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <p className="text-gray-600">No factual claims found in the provided text.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium text-gray-900">
        {result.claims.length} Factual Claims Extracted
      </h2>
      {result.claims.map((claim, index) => (
        <div key={index} className="bg-white shadow rounded-lg p-4">
          <p className="text-sm text-gray-900 mb-2 font-medium">{claim.claim}</p>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${
              claim.type === 'factual' ? 'text-blue-800 bg-blue-100' :
              claim.type === 'statistical' ? 'text-purple-800 bg-purple-100' :
              claim.type === 'historical' ? 'text-amber-800 bg-amber-100' :
              claim.type === 'scientific' ? 'text-green-800 bg-green-100' :
              'text-gray-800 bg-gray-100'
            }`}>
              {claim.type.toUpperCase()}
            </span>
            <span className={`text-xs px-2 py-1 rounded-full ${
              claim.verifiable ? 'text-green-800 bg-green-100' : 'text-red-800 bg-red-100'
            }`}>
              {claim.verifiable ? 'Verifiable' : 'Not Verifiable'}
            </span>
            <span className="text-xs text-gray-500">
              Confidence: {Math.round(claim.confidence * 100)}%
            </span>
          </div>
          {claim.context && (
            <p className="text-xs text-gray-600 mt-1">
              <strong>Context:</strong> {claim.context}
            </p>
          )}
        </div>
      ))}
      {result.metadata && (
        <div className="text-xs text-gray-500 mt-4">
          Total claims processed: {result.metadata.totalClaims}
          {result.metadata.processingTime && ` • Processing time: ${result.metadata.processingTime}ms`}
        </div>
      )}
    </div>
  );
}

export default function ExtractFactualClaimsPage() {
  const [text, setText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ExtractFactualClaimsResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Get schemas from centralized registry
  const { inputSchema, outputSchema } = toolSchemas[extractFactualClaimsTool.config.id as keyof typeof toolSchemas];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await runToolWithAuth<{ text: string }, ExtractFactualClaimsResult>('/api/tools/extract-factual-claims', { text });
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const examples = [
    "The Great Wall of China was built over several centuries and stretches approximately 13,000 miles. It was constructed using various materials including stone, brick, and earth.",
    "In 2023, global temperatures rose by 1.2°C above pre-industrial levels. Sea levels have increased by 21cm since 1993 according to NASA data.",
    "Apple Inc. was founded in 1976 by Steve Jobs, Steve Wozniak, and Ronald Wayne. The company went public in 1980 with the largest IPO in history at that time.",
    "COVID-19 has infected over 700 million people worldwide as of 2024. The virus belongs to the coronavirus family and causes respiratory illness."
  ];

  // Try tab content (form and results)
  const tryContent = (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow-sm border">
        <div>
          <label htmlFor="text" className="block text-sm font-medium text-gray-700 mb-1">
            Text to Analyze <span className="text-red-500">*</span>
          </label>
          <textarea
            id="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            rows={10}
            placeholder="Enter text to extract factual claims from..."
            required
          />
        </div>

        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Example texts:</p>
          <div className="space-y-2">
            {examples.map((example: string, i: number) => (
              <button
                key={i}
                type="button"
                onClick={() => setText(example)}
                className="block w-full text-left px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded border text-gray-700 transition-colors"
              >
                {example.substring(0, 100)}...
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading || !text.trim()}
          className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Extracting Claims...' : 'Extract Claims'}
        </button>
      </form>

      {error && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-800">Error: {error}</p>
        </div>
      )}

      {result && (
        <div className="mt-8">
          {renderResult(result)}
        </div>
      )}
    </div>
  );

  // README content from generated file
  const readmeContent = getToolReadme(extractFactualClaimsTool.config.id);

  // Docs tab content
  const docsContent = (
    <ToolDocumentation 
      toolId={extractFactualClaimsTool.config.id}
      inputSchema={inputSchema}
      outputSchema={outputSchema}
      readmeContent={readmeContent}
    />
  );

  return (
    <TabbedToolPageLayout
      title={extractFactualClaimsTool.config.name}
      description={extractFactualClaimsTool.config.description}
      icon={<MagnifyingGlassIcon className="h-8 w-8 text-indigo-600" />}
      warning="Claim extraction is based on AI analysis. Review extracted claims for accuracy and completeness before using them for research or verification."
      tryContent={tryContent}
      docsContent={docsContent}
    />
  );
}