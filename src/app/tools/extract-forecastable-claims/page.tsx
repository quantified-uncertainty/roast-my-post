'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronLeftIcon } from '@heroicons/react/24/outline';

interface ExtractedForecast {
  text: string;
  topic: string;
  probability?: number;
  timeframe?: string;
  worthDetailedAnalysis: boolean;
  reasoning?: string;
}

export default function ExtractForecastableClaimsPage() {
  const [text, setText] = useState('');
  const [agentInstructions, setAgentInstructions] = useState(
    'Focus on technology predictions, economic forecasts, and climate predictions with specific timeframes.'
  );
  const [maxDetailedAnalysis, setMaxDetailedAnalysis] = useState(3);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<ExtractedForecast[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setResults(null);

    try {
      const response = await fetch('/api/tools/extract-forecastable-claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, agentInstructions, maxDetailedAnalysis }),
      });

      if (!response.ok) {
        throw new Error(`Failed: ${response.statusText}`);
      }

      const data = await response.json();
      setResults(data.forecasts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const exampleText = `Market analysts predict that artificial intelligence will revolutionize healthcare 
by 2030, with AI-powered diagnostics achieving 95% accuracy rates. Meanwhile, quantum computing 
is expected to reach commercial viability within the next 5 years, potentially breaking current 
encryption standards.

Climate scientists warn that without immediate action, global temperatures will rise by 2°C 
above pre-industrial levels by 2040. There's also a 70% chance that renewable energy will 
constitute over 80% of global electricity generation by 2050.

In the tech sector, experts believe we'll see fully autonomous vehicles on most major highways 
by 2028, though full urban deployment might take another decade.`;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Link href="/tools" className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-6">
        <ChevronLeftIcon className="h-4 w-4 mr-1" />
        Back to Tools
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Extract Forecastable Claims</h1>
        <p className="text-gray-600">
          Extract prediction-like statements from text and identify which ones are worth detailed 
          probability analysis based on agent instructions.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow-sm border">
        <div>
          <label htmlFor="text" className="block text-sm font-medium text-gray-700 mb-1">
            Text to Analyze <span className="text-red-500">*</span>
          </label>
          <textarea
            id="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            rows={10}
            placeholder="Paste text containing predictions, forecasts, or future-oriented statements..."
            required
          />
          <button
            type="button"
            onClick={() => setText(exampleText)}
            className="mt-2 text-sm text-blue-600 hover:text-blue-800"
          >
            Use example text
          </button>
        </div>

        <div>
          <label htmlFor="agentInstructions" className="block text-sm font-medium text-gray-700 mb-1">
            Agent Instructions
          </label>
          <textarea
            id="agentInstructions"
            value={agentInstructions}
            onChange={(e) => setAgentInstructions(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
            placeholder="Describe what types of forecasts to prioritize..."
          />
        </div>

        <div>
          <label htmlFor="maxDetailedAnalysis" className="block text-sm font-medium text-gray-700 mb-1">
            Max Forecasts for Detailed Analysis
          </label>
          <input
            type="number"
            id="maxDetailedAnalysis"
            value={maxDetailedAnalysis}
            onChange={(e) => setMaxDetailedAnalysis(parseInt(e.target.value) || 3)}
            min={1}
            max={10}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Each detailed analysis makes 6 LLM calls
          </p>
        </div>

        <button
          type="submit"
          disabled={isLoading || !text.trim()}
          className="w-full bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Extracting Claims...' : 'Extract Forecastable Claims'}
        </button>
      </form>

      {error && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-800">Error: {error}</p>
        </div>
      )}

      {results && (
        <div className="mt-8 space-y-6">
          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
            <p className="text-purple-900">
              Found <span className="font-semibold">{results.length}</span> forecastable claims.
              {' '}
              <span className="font-semibold">
                {results.filter(r => r.worthDetailedAnalysis).length}
              </span> selected for detailed analysis.
            </p>
          </div>

          <div className="space-y-4">
            {results.map((forecast, i) => (
              <div
                key={i}
                className={`p-4 rounded-lg border ${
                  forecast.worthDetailedAnalysis
                    ? 'bg-green-50 border-green-200'
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-gray-900">{forecast.topic}</h3>
                  {forecast.worthDetailedAnalysis && (
                    <span className="text-xs px-2 py-1 bg-green-600 text-white rounded-full">
                      Selected for Analysis
                    </span>
                  )}
                </div>
                
                <p className="text-gray-700 mb-2">"{forecast.text}"</p>
                
                <div className="flex flex-wrap gap-4 text-sm">
                  {forecast.probability !== undefined && (
                    <span className="text-gray-600">
                      Stated probability: <span className="font-medium">{forecast.probability}%</span>
                    </span>
                  )}
                  {forecast.timeframe && (
                    <span className="text-gray-600">
                      Timeframe: <span className="font-medium">{forecast.timeframe}</span>
                    </span>
                  )}
                </div>
                
                {forecast.reasoning && (
                  <p className="mt-2 text-sm text-gray-600 italic">
                    Selection reasoning: {forecast.reasoning}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}