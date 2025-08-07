'use client';

import { useState } from 'react';
import { XCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/solid';
import { checkSpellingGrammarTool } from '@roast/ai';
import { runToolWithAuth } from '@/app/tools/utils/runToolWithAuth';
import type { CheckSpellingGrammarOutput } from '@roast/ai';

const checkToolPath = checkSpellingGrammarTool.config.path;

export default function CheckSpellingGrammarPage() {
  const [text, setText] = useState('');
  const [result, setResult] = useState<CheckSpellingGrammarOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheck = async () => {
    if (!text.trim()) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await runToolWithAuth<
        { text: string },
        CheckSpellingGrammarOutput
      >(checkToolPath, { text });
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Check Spelling & Grammar</h1>
        <p className="text-gray-600">
          Identify spelling and grammar errors in your text with AI-powered analysis.
        </p>
      </div>

      <div className="space-y-6">
        <div>
          <label htmlFor="text" className="block text-sm font-medium text-gray-700 mb-2">
            Enter text to check
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
          {isLoading ? 'Checking...' : 'Check Text'}
        </button>

        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {result && (
          <div className="space-y-6">
            {result.metadata && (
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Analysis Summary</h2>
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">Total Errors Found: {result.metadata.totalErrorsFound}</p>
                  <p className="text-sm text-gray-600">Convention: {result.metadata.convention} English</p>
                  {result.metadata.processingTime && (
                    <p className="text-sm text-gray-600">Processing Time: {result.metadata.processingTime}ms</p>
                  )}
                </div>
              </div>
            )}

            {result.errors && result.errors.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-medium text-gray-900">Errors Found</h2>
                {result.errors.map((error, index) => (
                  <div key={index} className="bg-white shadow rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      {error.importance >= 70 ? (
                        <XCircleIcon className="h-5 w-5 text-red-500 mt-0.5" />
                      ) : (
                        <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 capitalize">{error.type} Error</p>
                        <div className="text-sm text-gray-600 mt-1">
                          <span className="font-mono text-red-600">{error.text}</span>
                          <span className="mx-2">→</span>
                          <span className="font-mono text-green-600">{error.correction}</span>
                        </div>
                        {error.context && (
                          <p className="text-sm text-gray-500 mt-2 font-mono bg-gray-50 p-2 rounded">
                            {error.context}
                          </p>
                        )}
                        {error.description && (
                          <p className="text-sm text-gray-600 mt-2">{error.description}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          {error.lineNumber && (
                            <span>Line {error.lineNumber}</span>
                          )}
                          <span>Confidence: {error.confidence}%</span>
                          <span>Importance: {error.importance}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {result.errors && result.errors.length === 0 && (
              <div className="bg-green-50 rounded-lg p-6">
                <h2 className="text-lg font-medium text-green-900 mb-2">No Errors Found</h2>
                <p className="text-sm text-green-700">
                  Great! Your text appears to be free of spelling and grammar errors.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}