'use client';

import { useState } from 'react';
import { ChartBarIcon } from '@heroicons/react/24/outline';
import { forecasterTool, toolSchemas } from '@roast/ai';
import { runToolWithAuth } from '@/app/tools/utils/runToolWithAuth';
import { ToolPageLayout } from '../components/ToolPageLayout';
import { ApiDocumentation } from '../components/ApiDocumentation';

const checkToolPath = forecasterTool.config.path;

export default function ForecasterSimplePage() {
  const [question, setQuestion] = useState('');
  const [result, setResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Get schemas from centralized registry
  const { inputSchema, outputSchema } = toolSchemas[forecasterTool.config.id as keyof typeof toolSchemas];

  const handleForecast = async () => {
    if (!question.trim()) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await runToolWithAuth(checkToolPath, { question });
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ToolPageLayout
      title={forecasterTool.config.name}
      description={forecasterTool.config.description}
      icon={<ChartBarIcon className="h-8 w-8 text-indigo-600" />}
    >

      <div className="space-y-6">
        <div>
          <label htmlFor="question" className="block text-sm font-medium text-gray-700 mb-2">
            Forecasting Question
          </label>
          <textarea
            id="question"
            rows={3}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            placeholder="Enter a question to forecast..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
        </div>

        <button
          onClick={handleForecast}
          disabled={isLoading || !question.trim()}
          className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Forecasting...' : 'Generate Forecast'}
        </button>

        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {result && (
          <div className="space-y-4">
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Forecast</h2>
              {result.prediction && (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Prediction</p>
                    <p className="text-2xl font-bold text-gray-900">{result.prediction.forecast}%</p>
                  </div>
                  {result.prediction.reasoning && (
                    <div>
                      <p className="text-sm font-medium text-gray-700">Reasoning</p>
                      <p className="text-sm text-gray-600 mt-1">{result.prediction.reasoning}</p>
                    </div>
                  )}
                  {result.prediction.confidence && (
                    <p className="text-sm text-gray-500">
                      Confidence: {result.prediction.confidence}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      <ApiDocumentation 
        title="API Documentation"
        endpoint={`/api/tools/${forecasterTool.config.id}`}
        method="POST"
        inputSchema={inputSchema}
        outputSchema={outputSchema}
      />
    </ToolPageLayout>
  );
}
