/**
 * ToolPageTemplate - Standard template for tool pages with auto-generated forms
 */
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ChevronLeftIcon } from '@heroicons/react/24/outline';
import { ToolPageTemplateProps } from './types';
import { AutoToolForm } from './AutoToolForm';

export function ToolPageTemplate<TInput extends Record<string, any>, TOutput>({
  tool,
  renderResults,
  formConfig = {}
}: ToolPageTemplateProps<TInput, TOutput>) {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<TOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const handleSubmit = async (data: TInput) => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    
    try {
      const response = await fetch(`/api/tools/${tool.config.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed: ${response.statusText}`);
      }
      
      const responseData = await response.json();
      if (responseData.success && responseData.result) {
        setResult(responseData.result);
      } else {
        throw new Error(responseData.error || 'Unknown error occurred');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Link href="/tools" className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-6">
        <ChevronLeftIcon className="h-4 w-4 mr-1" />
        Back to Tools
      </Link>
      
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{tool.config.name}</h1>
        <p className="text-gray-600">{tool.config.description}</p>
        {tool.config.costEstimate && (
          <p className="text-sm text-gray-500 mt-1">
            Estimated cost: {tool.config.costEstimate}
          </p>
        )}
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <AutoToolForm<TInput>
          schema={tool.inputSchema}
          onSubmit={handleSubmit}
          isLoading={isLoading}
          error={error}
          config={{
            ...formConfig,
            submitButtonText: formConfig.submitButtonText || `Run ${tool.config.name}`,
          }}
        />
      </div>
      
      {/* Results section */}
      {result !== null && (
        <div className="mt-8">
          {renderResults ? (
            renderResults(result)
          ) : (
            <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
              <h2 className="text-lg font-semibold mb-2">Results</h2>
              <pre className="whitespace-pre-wrap font-mono text-sm">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}