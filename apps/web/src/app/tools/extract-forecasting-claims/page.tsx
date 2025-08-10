'use client';

import { useState } from 'react';
import { CheckCircleIcon, ExclamationTriangleIcon, XCircleIcon, ChartBarIcon } from '@heroicons/react/24/solid';
import { extractForecastingClaimsTool, toolSchemas, getToolReadme } from '@roast/ai';
import { runToolWithAuth } from '@/app/tools/utils/runToolWithAuth';
import { TabbedToolPageLayout } from '@/app/tools/components/TabbedToolPageLayout';
import { ToolDocumentation } from '@/app/tools/components/ToolDocumentation';

const checkToolPath = extractForecastingClaimsTool.config.path;

export default function ExtractForecastingClaimsPage() {
  const [text, setText] = useState('');
  const [result, setResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Get schemas from centralized registry
  const { inputSchema, outputSchema } = toolSchemas[extractForecastingClaimsTool.config.id as keyof typeof toolSchemas];

  const handleExtract = async () => {
    if (!text.trim()) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await runToolWithAuth(checkToolPath, { text });
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 70) return CheckCircleIcon;
    if (score >= 40) return ExclamationTriangleIcon;
    return XCircleIcon;
  };

  const examples = [
    "By 2030, renewable energy will account for 80% of global electricity generation, driven by falling costs and government incentives.",
    "The S&P 500 will likely reach 6,000 points by the end of 2025, assuming continued economic growth and AI sector expansion.",
    "Climate change will cause sea levels to rise by 15-25cm by 2050, affecting coastal cities worldwide.",
    "Electric vehicle adoption will exceed 50% of new car sales in Europe by 2028 due to stricter emissions regulations."
  ];

  // Try tab content (form and results)
  const tryContent = (
    <div className="space-y-6">
      <form onSubmit={(e) => { e.preventDefault(); handleExtract(); }} className="space-y-6 bg-white p-6 rounded-lg shadow-sm border">
        <div>
          <label htmlFor="text" className="block text-sm font-medium text-gray-700 mb-1">
            Text with Predictions <span className="text-red-500">*</span>
          </label>
          <textarea
            id="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            rows={10}
            placeholder="Enter text containing predictions or forecasts..."
            required
          />
        </div>

        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Example predictions:</p>
          <div className="space-y-2">
            {examples.map((example: string, i: number) => (
              <button
                key={i}
                type="button"
                onClick={() => setText(example)}
                className="block w-full text-left px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded border text-gray-700 transition-colors"
              >
                {example}
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading || !text.trim()}
          className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Extracting Forecasts...' : 'Extract Forecasts'}
        </button>
      </form>

      {error && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-800">Error: {error}</p>
        </div>
      )}

      {result && result.forecasts && (
        <div className="mt-8 space-y-4">
          <h2 className="text-lg font-medium text-gray-900">
            {result.forecasts.length} Forecasts Found
          </h2>
          {result.forecasts.map((forecast: any, index: number) => (
            <div key={index} className="bg-white shadow rounded-lg p-6">
              <p className="text-gray-900 mb-4">{forecast.originalText}</p>
              
              {forecast.rewrittenPredictionText && (
                <div className="bg-blue-50 rounded p-3 mb-4">
                  <p className="text-sm text-blue-900">
                    <strong>Clarified:</strong> {forecast.rewrittenPredictionText}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {['precisionScore', 'verifiabilityScore', 'importanceScore', 'robustnessScore'].map((scoreType) => {
                  const score = forecast[scoreType];
                  if (score === undefined) return null;
                  const Icon = getScoreIcon(score);
                  return (
                    <div key={scoreType} className="text-center">
                      <Icon className={`h-6 w-6 mx-auto mb-1 ${getScoreColor(score)}`} />
                      <p className="text-xs text-gray-500">{scoreType.replace('Score', '')}</p>
                      <p className={`text-lg font-semibold ${getScoreColor(score)}`}>{score}</p>
                    </div>
                  );
                })}
              </div>

              {(forecast.resolutionDate || forecast.authorProbability) && (
                <div className="mt-4 flex flex-wrap gap-4 text-sm">
                  {forecast.resolutionDate && (
                    <span className="text-gray-600">
                      <strong>Resolution:</strong> {forecast.resolutionDate}
                    </span>
                  )}
                  {forecast.authorProbability && (
                    <span className="text-gray-600">
                      <strong>Probability:</strong> {forecast.authorProbability}%
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // README content from generated file
  const readmeContent = getToolReadme(extractForecastingClaimsTool.config.id as any);

  // Docs tab content
  const docsContent = (
    <ToolDocumentation 
      toolId={extractForecastingClaimsTool.config.id}
      inputSchema={inputSchema}
      outputSchema={outputSchema}
      readmeContent={readmeContent}
    />
  );

  return (
    <TabbedToolPageLayout
      title={extractForecastingClaimsTool.config.name}
      description={extractForecastingClaimsTool.config.description}
      icon={<ChartBarIcon className="h-8 w-8 text-purple-600" />}
      tryContent={tryContent}
      docsContent={docsContent}
    />
  );
}
