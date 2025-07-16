'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronLeftIcon } from '@heroicons/react/24/outline';

interface ForecastResult {
  probability: number;
  description: string;
  individualForecasts: Array<{
    probability: number;
    confidence: string;
    reasoning: string;
  }>;
  statistics: {
    mean: number;
    median: number;
    std_dev: number;
    range: [number, number];
  };
  outliersRemoved: number;
}

export default function SimpleForecasterPage() {
  const [question, setQuestion] = useState('');
  const [context, setContext] = useState('');
  const [timeframe, setTimeframe] = useState('');
  const [numForecasts, setNumForecasts] = useState(6);
  const [usePerplexity, setUsePerplexity] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ForecastResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/tools/forecaster-simple', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, context, timeframe, numForecasts, usePerplexity }),
      });

      if (!response.ok) {
        throw new Error(`Failed: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.success && data.result) {
        setResult(data.result);
      } else {
        throw new Error(data.error || 'Unknown error occurred');
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Simple Forecaster</h1>
        <p className="text-gray-600">
          Generate a probability forecast using 6 independent Claude analyses. The system will
          remove outliers and provide an aggregated forecast with confidence levels.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow-sm border">
        <div>
          <label htmlFor="question" className="block text-sm font-medium text-gray-700 mb-1">
            Forecasting Question <span className="text-red-500">*</span>
          </label>
          <textarea
            id="question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={2}
            placeholder="e.g., Will SpaceX successfully land humans on Mars by 2035?"
            required
          />
        </div>

        <div>
          <label htmlFor="context" className="block text-sm font-medium text-gray-700 mb-1">
            Context (optional)
          </label>
          <textarea
            id="context"
            value={context}
            onChange={(e) => setContext(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
            placeholder="e.g., SpaceX has announced plans for Mars missions, current technology state..."
          />
        </div>

        <div>
          <label htmlFor="timeframe" className="block text-sm font-medium text-gray-700 mb-1">
            Timeframe (optional)
          </label>
          <input
            type="text"
            id="timeframe"
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., By December 31, 2035"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="numForecasts" className="block text-sm font-medium text-gray-700 mb-1">
              Number of Forecasts
            </label>
            <input
              type="number"
              id="numForecasts"
              value={numForecasts}
              onChange={(e) => setNumForecasts(parseInt(e.target.value) || 6)}
              min={3}
              max={20}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">3-20 forecasts (default: 6)</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Research Options
            </label>
            <div className="mt-2">
              <label className="inline-flex items-center">
                <input
                  type="checkbox"
                  checked={usePerplexity}
                  onChange={(e) => setUsePerplexity(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Use Perplexity for research
                </span>
              </label>
              <p className="text-xs text-gray-500 mt-1">
                {usePerplexity ? '🔍 Will search for relevant context' : 'Using only provided context'}
              </p>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading || !question.trim()}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? `Generating ${numForecasts} Forecasts...` : 'Generate Forecast'}
        </button>
      </form>

      {error && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-800">Error: {error}</p>
        </div>
      )}

      {result && (
        <div className="mt-8 space-y-6">
          <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
            <h2 className="text-2xl font-bold text-blue-900 mb-2">
              Forecast: {result.probability.toFixed(1)}%
            </h2>
            <p className="text-gray-700">{result.description}</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold mb-4">Statistics</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-600">Mean</p>
                <p className="text-xl font-semibold">{result.statistics.mean.toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Median</p>
                <p className="text-xl font-semibold">{result.statistics.median.toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Std Dev</p>
                <p className="text-xl font-semibold">{result.statistics.std_dev.toFixed(1)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Range</p>
                <p className="text-xl font-semibold">
                  {result.statistics.range[0]}-{result.statistics.range[1]}%
                </p>
              </div>
            </div>
            {result.outliersRemoved > 0 && (
              <p className="mt-4 text-sm text-amber-600">
                {result.outliersRemoved} outlier{result.outliersRemoved > 1 ? 's' : ''} removed
              </p>
            )}
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold mb-4">Individual Forecasts</h3>
            <div className="space-y-3">
              {result.individualForecasts.map((forecast, i) => (
                <div key={i} className="border-l-4 border-gray-200 pl-4 py-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">Forecast {i + 1}</span>
                    <span className="text-lg font-semibold">{forecast.probability.toFixed(1)}%</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-1">
                    Confidence: <span className="capitalize">{forecast.confidence}</span>
                  </p>
                  <p className="text-sm text-gray-700">{forecast.reasoning}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}