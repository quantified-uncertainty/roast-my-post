'use client';

import { useState } from 'react';
import { detectLanguageConventionTool, type DetectLanguageConventionOutput } from '@roast/ai';
import { runToolWithAuth } from '@/app/tools/utils/runToolWithAuth';

const checkToolPath = detectLanguageConventionTool.config.path;

export default function DetectLanguageConventionPage() {
  const [text, setText] = useState('');
  const [result, setResult] = useState<DetectLanguageConventionOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheck = async () => {
    if (!text.trim()) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await runToolWithAuth<{ text: string }, DetectLanguageConventionOutput>(checkToolPath, { text });
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Detect Language Convention</h1>
        <p className="text-gray-600">
          Analyze text to detect the language variant (US English, UK English, etc.).
        </p>
      </div>

      <div className="space-y-6">
        <div>
          <label htmlFor="text" className="block text-sm font-medium text-gray-700 mb-2">
            Enter text to analyze
          </label>
          <textarea
            id="text"
            rows={10}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            placeholder="Enter your text here..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </div>

        <button
          onClick={handleCheck}
          disabled={isLoading || !text.trim()}
          className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Analyzing...' : 'Analyze Text'}
        </button>

        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {result && (
          <div className="space-y-6">
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Detected Convention</h2>
              <div className="space-y-2">
                <p className="text-2xl font-bold">{result.convention || 'Unknown'} English</p>
                {result.confidence !== undefined && (
                  <p className="text-sm text-gray-600">Confidence: {Math.round(result.confidence * 100)}%</p>
                )}
                {result.consistency !== undefined && (
                  <p className="text-sm text-gray-600">Consistency: {Math.round(result.consistency * 100)}%</p>
                )}
              </div>
            </div>

            {result.documentType && (
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Document Type</h2>
                <div className="space-y-2">
                  <p className="text-lg font-semibold capitalize">{result.documentType.type || 'Unknown'}</p>
                  {result.documentType.confidence !== undefined && (
                    <p className="text-sm text-gray-600">Confidence: {Math.round(result.documentType.confidence * 100)}%</p>
                  )}
                </div>
              </div>
            )}

            {result.evidence && result.evidence.length > 0 && (
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Evidence</h2>
                <ul className="space-y-2">
                  {result.evidence.map((item, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-sm text-gray-900">• {item.word} ({item.convention}): {item.count} occurrence{item.count !== 1 ? 's' : ''}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
