'use client';

import { useState } from 'react';
import { factCheckerTool } from '@roast/ai';
import { runToolWithAuth } from '@/app/tools/utils/runToolWithAuth';

const checkToolPath = factCheckerTool.config.path;

export default function FactCheckerPage() {
  const [text, setText] = useState('');
  const [result, setResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheck = async () => {
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

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Fact Checker</h1>
        <p className="text-gray-600">
          Check facts and verify claims using AI-powered analysis.
        </p>
      </div>

      <div className="space-y-6">
        <div>
          <label htmlFor="text" className="block text-sm font-medium text-gray-700 mb-2">
            Enter text to fact-check
          </label>
          <textarea
            id="text"
            rows={10}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            placeholder="Enter text containing facts to check..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </div>

        <button
          onClick={handleCheck}
          disabled={isLoading || !text.trim()}
          className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Checking...' : 'Check Facts'}
        </button>

        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {result && result.checkedClaims && (
          <div className="space-y-4">
            <h2 className="text-lg font-medium text-gray-900">
              {result.checkedClaims.length} Claims Checked
            </h2>
            {result.checkedClaims.map((claim: any, index: number) => (
              <div key={index} className="bg-white shadow rounded-lg p-4">
                <p className="text-sm text-gray-900 mb-2">{claim.claim}</p>
                <div className="flex items-start space-x-2">
                  <span className={`text-sm font-medium ${
                    claim.verdict === 'TRUE' ? 'text-green-600' :
                    claim.verdict === 'FALSE' ? 'text-red-600' :
                    claim.verdict === 'MOSTLY_TRUE' ? 'text-blue-600' :
                    claim.verdict === 'MOSTLY_FALSE' ? 'text-orange-600' :
                    'text-gray-600'
                  }`}>
                    {claim.verdict}
                  </span>
                  <p className="text-sm text-gray-600 flex-1">{claim.explanation}</p>
                </div>
                {claim.confidence && (
                  <p className="text-xs text-gray-500 mt-2">
                    Confidence: {Math.round(claim.confidence * 100)}%
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
