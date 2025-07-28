'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronLeftIcon } from '@heroicons/react/24/outline';

interface CheckMathResult {
  status: 'verified_true' | 'verified_false' | 'cannot_verify';
  explanation: string;
  reasoning?: string;
  errorDetails?: {
    errorType: string;
    severity: string;
    conciseCorrection?: string;
    expectedValue?: string;
    actualValue?: string;
  };
}

export default function MathCheckerPage() {
  const [statement, setStatement] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<CheckMathResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/tools/check-math', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statement }),
      });

      if (!response.ok) {
        throw new Error(`Failed: ${response.statusText}`);
      }

      const data = await response.json();
      setResult(data.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const exampleStatements = [
    'Revenue grew by 50% from $2 million to $3.5 million',
    '15% of $3.5 million equals $525,000',
    'The square root of 16 is 5',
    '2 + 2 = 4',
    'The derivative of x^2 is 3x'
  ];

  const severityColors = {
    critical: 'bg-red-100 border-red-300 text-red-900',
    major: 'bg-orange-100 border-orange-300 text-orange-900',
    minor: 'bg-yellow-100 border-yellow-300 text-yellow-900',
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Link href="/tools" className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-6">
        <ChevronLeftIcon className="h-4 w-4 mr-1" />
        Back to Tools
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Math Statement Checker</h1>
        <p className="text-gray-600">
          Check a single mathematical statement for accuracy and correctness.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow-sm border">
        <div>
          <label htmlFor="statement" className="block text-sm font-medium text-gray-700 mb-1">
            Mathematical Statement <span className="text-red-500">*</span>
          </label>
          <input
            id="statement"
            type="text"
            value={statement}
            onChange={(e) => setStatement(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            placeholder="Enter a mathematical statement (e.g., '2 + 2 = 4')"
            required
          />
          <div className="mt-2 space-y-1">
            <p className="text-sm text-gray-600">Example statements:</p>
            <div className="flex flex-wrap gap-2">
              {exampleStatements.map((example, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setStatement(example)}
                  className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded border border-gray-300"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading || !statement.trim()}
          className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Checking Statement...' : 'Check Statement'}
        </button>
      </form>

      {error && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-800">Error: {error}</p>
        </div>
      )}

      {result && (
        <div className="mt-8 space-y-6">
          <div className={`p-6 rounded-lg border ${
            result.status === 'verified_true' 
              ? 'bg-green-50 border-green-200' 
              : result.status === 'verified_false'
              ? 'bg-red-50 border-red-200'
              : 'bg-yellow-50 border-yellow-200'
          }`}>
            <div className="mb-4">
              <h3 className="text-lg font-semibold">
                {result.status === 'verified_true' && '✓ Statement is Correct'}
                {result.status === 'verified_false' && '✗ Statement Contains Error'}
                {result.status === 'cannot_verify' && '? Cannot Verify Statement'}
              </h3>
            </div>
            
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-gray-700">Statement:</p>
                <p className="mt-1 font-mono text-sm bg-white bg-opacity-60 p-2 rounded">
                  "{statement}"
                </p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-700">Explanation:</p>
                <p className="mt-1 text-sm">{result.explanation}</p>
              </div>
              
              {result.reasoning && (
                <div>
                  <p className="text-sm font-medium text-gray-700">Reasoning:</p>
                  <p className="mt-1 text-sm">{result.reasoning}</p>
                </div>
              )}
              
              {result.errorDetails && (
                <div className="mt-4 p-3 bg-white bg-opacity-60 rounded">
                  <p className="text-sm font-medium text-gray-700 mb-2">Error Details:</p>
                  <div className="space-y-1 text-sm">
                    <p><span className="font-medium">Type:</span> {result.errorDetails.errorType}</p>
                    <p><span className="font-medium">Severity:</span> {result.errorDetails.severity}</p>
                    {result.errorDetails.conciseCorrection && (
                      <p><span className="font-medium">Correction:</span> {result.errorDetails.conciseCorrection}</p>
                    )}
                    {result.errorDetails.expectedValue && (
                      <p><span className="font-medium">Expected:</span> {result.errorDetails.expectedValue}</p>
                    )}
                    {result.errorDetails.actualValue && (
                      <p><span className="font-medium">Actual:</span> {result.errorDetails.actualValue}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}