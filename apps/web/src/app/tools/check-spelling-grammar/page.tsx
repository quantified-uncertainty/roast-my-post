'use client';

import { useState } from 'react';
import { CheckCircleIcon, XCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/solid';
import { checkSpellingGrammarTool } from '@roast/ai';
import { runToolWithAuth } from '@/app/tools/utils/runToolWithAuth';

const checkToolPath = checkSpellingGrammarTool.config.path;

export default function CheckSpellingGrammarPage() {
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
      const response = await runToolWithAuth(checkToolPath, {
        text,
        generateComments: true,
        gradeDocument: true
      });
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
            {result.grade && (
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Document Grade</h2>
                <div className="flex items-center space-x-4">
                  <div className="text-3xl font-bold">{result.grade.overallGrade}</div>
                  <div className="text-sm text-gray-600">
                    <p>Errors: {result.grade.errorCount}</p>
                    <p>Words: {result.grade.wordCount}</p>
                  </div>
                </div>
                {result.grade.reasoning && (
                  <p className="mt-4 text-sm text-gray-600">{result.grade.reasoning}</p>
                )}
              </div>
            )}

            {result.summary && (
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-2">Summary</h2>
                <p className="text-gray-600">{result.summary}</p>
              </div>
            )}

            {result.errors && result.errors.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-medium text-gray-900">Errors Found</h2>
                {result.errors.map((error: any, index: number) => (
                  <div key={index} className="bg-white shadow rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      {error.severity === 'error' ? (
                        <XCircleIcon className="h-5 w-5 text-red-500 mt-0.5" />
                      ) : (
                        <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{error.type}</p>
                        <p className="text-sm text-gray-600 mt-1">{error.message}</p>
                        {error.context && (
                          <p className="text-sm text-gray-500 mt-2 font-mono bg-gray-50 p-2 rounded">
                            {error.context.before}
                            <span className="text-red-600 font-bold">{error.context.text}</span>
                            {error.context.after}
                          </p>
                        )}
                        {error.suggestions && error.suggestions.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs text-gray-500">Suggestions:</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {error.suggestions.map((suggestion: string, idx: number) => (
                                <span key={idx} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                                  {suggestion}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {result.comments && result.comments.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-medium text-gray-900">Generated Comments</h2>
                {result.comments.map((comment: any, index: number) => (
                  <div key={index} className="bg-blue-50 rounded-lg p-4">
                    <p className="text-sm text-blue-900">{comment.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
