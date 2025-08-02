'use client';

import { useState } from 'react';
import { CheckCircleIcon, ExclamationTriangleIcon, XCircleIcon } from '@heroicons/react/24/solid';
import { extractForecastingClaimsTool } from '@roast/ai';
import { runToolWithAuth } from '@/app/tools/utils/runToolWithAuth';

const checkToolPath = extractForecastingClaimsTool.config.path;

export default function ExtractForecastingClaimsPage() {
  const [text, setText] = useState('');
  const [result, setResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Extract Forecasting Claims</h1>
        <p className="text-gray-600">
          Extract and analyze predictions and forecasts from text.
        </p>
      </div>

      <div className="space-y-6">
        <div>
          <label htmlFor="text" className="block text-sm font-medium text-gray-700 mb-2">
            Enter text with predictions
          </label>
          <textarea
            id="text"
            rows={10}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            placeholder="Enter text containing predictions or forecasts..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </div>

        <button
          onClick={handleExtract}
          disabled={isLoading || !text.trim()}
          className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Extracting...' : 'Extract Forecasts'}
        </button>

        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {result && result.forecasts && (
          <div className="space-y-4">
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
    </div>
  );
}
