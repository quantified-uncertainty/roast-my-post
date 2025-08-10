'use client';

import { useState } from 'react';
import { ChartBarIcon } from '@heroicons/react/24/outline';
import { toolSchemas, getToolReadme } from '@roast/ai';
import { runToolWithAuth } from '@/app/tools/utils/runToolWithAuth';
import { TabbedToolPageLayout } from '../components/TabbedToolPageLayout';
import { ToolDocumentation } from '../components/ToolDocumentation';

interface ForecastResult {
  question: string;
  probability: number;
  description: string;
  reasoning?: string;
  consensus: 'low' | 'medium' | 'high';
  individualForecasts: Array<{
    probability: number;
    reasoning: string;
  }>;
  statistics: {
    mean: number;
    median: number;
    stdDev: number;
    min: number;
    max: number;
  };
}

export default function ForecasterSimplePage() {
  const [question, setQuestion] = useState('');
  const [context, setContext] = useState('');
  const [numForecasts, setNumForecasts] = useState(3);
  const [result, setResult] = useState<ForecastResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Get schemas from centralized registry
  const { inputSchema, outputSchema } = toolSchemas['forecaster' as keyof typeof toolSchemas];

  const handleForecast = async () => {
    if (!question.trim()) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await runToolWithAuth<{ question: string; context?: string; numForecasts?: number; usePerplexity?: boolean }, ForecastResult>(
        '/api/tools/forecaster-simple', 
        { 
          question, 
          context: context.trim() || undefined,
          numForecasts,
          usePerplexity: false 
        }
      );
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const exampleQuestions = [
    'Will AI assistants be widely adopted in software development by 2025?',
    'Will electric vehicles represent over 50% of new car sales by 2030?',
    'Will a major social media platform shut down in the next 2 years?',
    'Will quantum computers solve a practically useful problem by 2026?'
  ];

  const getConsensusColor = (consensus: string) => {
    switch (consensus) {
      case 'high':
        return 'bg-green-100 text-green-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Try tab content
  const tryContent = (
    <div className="space-y-6">
      <form onSubmit={(e) => { e.preventDefault(); handleForecast(); }} className="space-y-6 bg-white p-6 rounded-lg shadow-sm border">
        <div>
          <label htmlFor="question" className="block text-sm font-medium text-gray-700 mb-1">
            Forecasting Question <span className="text-red-500">*</span>
          </label>
          <textarea
            id="question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            rows={3}
            placeholder="Enter a yes/no question about a future event..."
            required
          />
        </div>

        <div>
          <label htmlFor="context" className="block text-sm font-medium text-gray-700 mb-1">
            Additional Context (Optional)
          </label>
          <textarea
            id="context"
            value={context}
            onChange={(e) => setContext(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            rows={3}
            placeholder="Provide any relevant background information or constraints..."
          />
        </div>

        <div>
          <label htmlFor="numForecasts" className="block text-sm font-medium text-gray-700 mb-1">
            Number of Forecasts
          </label>
          <select
            id="numForecasts"
            value={numForecasts}
            onChange={(e) => setNumForecasts(parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value={1}>1 Forecast</option>
            <option value={3}>3 Forecasts (Recommended)</option>
            <option value={5}>5 Forecasts</option>
            <option value={10}>10 Forecasts</option>
          </select>
        </div>

        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Example questions:</p>
          <div className="space-y-2">
            {exampleQuestions.map((example, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setQuestion(example)}
                className="block w-full text-left px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded border text-gray-700 transition-colors"
              >
                {example}
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading || !question.trim()}
          className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Generating Forecast...' : 'Generate Forecast'}
        </button>
      </form>

      {error && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-800">Error: {error}</p>
        </div>
      )}

      {result && (
        <div className="mt-8 space-y-6">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Forecast Result</h2>
            
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-gray-700">Final Probability</h3>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getConsensusColor(result.consensus)}`}>
                  {result.consensus} consensus
                </span>
              </div>
              <div className="relative pt-1">
                <div className="flex mb-2 items-center justify-between">
                  <div>
                    <span className="text-3xl font-bold text-indigo-600">
                      {result.probability}%
                    </span>
                  </div>
                </div>
                <div className="overflow-hidden h-4 mb-4 text-xs flex rounded bg-gray-200">
                  <div
                    style={{ width: `${result.probability}%` }}
                    className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-indigo-500"
                  />
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-2">{result.description}</p>
              {result.reasoning && (
                <p className="text-sm text-gray-500 mt-2 italic">{result.reasoning}</p>
              )}
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium text-gray-700 mb-3">Statistics</h4>
              <div className="grid grid-cols-5 gap-3 text-center">
                <div className="bg-gray-50 p-2 rounded">
                  <p className="text-xs text-gray-600">Mean</p>
                  <p className="font-semibold">{result.statistics.mean}%</p>
                </div>
                <div className="bg-gray-50 p-2 rounded">
                  <p className="text-xs text-gray-600">Median</p>
                  <p className="font-semibold">{result.statistics.median}%</p>
                </div>
                <div className="bg-gray-50 p-2 rounded">
                  <p className="text-xs text-gray-600">Std Dev</p>
                  <p className="font-semibold">{result.statistics.stdDev.toFixed(1)}%</p>
                </div>
                <div className="bg-gray-50 p-2 rounded">
                  <p className="text-xs text-gray-600">Min</p>
                  <p className="font-semibold">{result.statistics.min}%</p>
                </div>
                <div className="bg-gray-50 p-2 rounded">
                  <p className="text-xs text-gray-600">Max</p>
                  <p className="font-semibold">{result.statistics.max}%</p>
                </div>
              </div>
            </div>

            {result.individualForecasts.length > 1 && (
              <div className="border-t pt-4 mt-4">
                <h4 className="font-medium text-gray-700 mb-3">Individual Forecasts</h4>
                <div className="space-y-3">
                  {result.individualForecasts.map((forecast, index) => (
                    <div key={index} className="bg-gray-50 p-3 rounded">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">Forecast {index + 1}</span>
                        <span className="text-lg font-bold text-indigo-600">{forecast.probability}%</span>
                      </div>
                      <p className="text-sm text-gray-600">{forecast.reasoning}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  // README content from generated file
  const readmeContent = getToolReadme('forecaster');

  // Docs tab content
  const docsContent = (
    <ToolDocumentation 
      toolId="forecaster"
      inputSchema={inputSchema}
      outputSchema={outputSchema}
      readmeContent={readmeContent}
    />
  );

  return (
    <TabbedToolPageLayout
      title="Forecaster (Simple)"
      description="Generate probabilistic forecasts for yes/no questions about future events"
      icon={<ChartBarIcon className="h-8 w-8 text-indigo-600" />}
      tryContent={tryContent}
      docsContent={docsContent}
    />
  );
}