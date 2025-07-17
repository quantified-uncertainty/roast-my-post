'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronLeftIcon } from '@heroicons/react/24/outline';

interface MathError {
  type: string;
  severity: string;
  highlightedText: string;
  description: string;
  lineStart?: number;
  lineEnd?: number;
}

export default function MathCheckerPage() {
  const [text, setText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<MathError[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setErrors(null);

    try {
      const response = await fetch('/api/tools/check-math', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error(`Failed: ${response.statusText}`);
      }

      const data = await response.json();
      setErrors(data.errors);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const exampleText = `Our analysis shows that revenue grew by 50% from $2 million to $3.5 million 
last year. With a 15% profit margin, that means we made $525,000 in profit (15% of $3.5 million).

If we maintain this growth rate, next year's revenue will be $5.25 million (50% increase from 
$3.5 million). At the same margin, profits would reach $787,500.

The compound annual growth rate (CAGR) over 3 years would be approximately 38% if we grow from 
$2 million to $5.25 million.`;

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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Math Error Checker</h1>
        <p className="text-gray-600">
          Check text for mathematical errors, incorrect calculations, and numerical inconsistencies.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow-sm border">
        <div>
          <label htmlFor="text" className="block text-sm font-medium text-gray-700 mb-1">
            Text to Check <span className="text-red-500">*</span>
          </label>
          <textarea
            id="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            rows={10}
            placeholder="Paste text containing calculations, statistics, or mathematical claims..."
            required
          />
          <button
            type="button"
            onClick={() => setText(exampleText)}
            className="mt-2 text-sm text-blue-600 hover:text-blue-800"
          >
            Use example text with errors
          </button>
        </div>

        <button
          type="submit"
          disabled={isLoading || !text.trim()}
          className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Checking for Math Errors...' : 'Check Math'}
        </button>
      </form>

      {error && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-800">Error: {error}</p>
        </div>
      )}

      {errors !== null && (
        <div className="mt-8 space-y-6">
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <p className="text-green-900">
              Found <span className="font-semibold">{errors.length}</span> mathematical{' '}
              {errors.length === 1 ? 'error' : 'errors'}.
            </p>
          </div>

          {errors.length === 0 ? (
            <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
              <p className="text-blue-900">✓ No mathematical errors detected!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {errors.map((mathError, i) => (
                <div
                  key={i}
                  className={`p-4 rounded-lg border ${
                    severityColors[mathError.severity as keyof typeof severityColors] ||
                    severityColors.minor
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span className="font-semibold capitalize">{mathError.type} Error</span>
                      <span className="ml-2 text-sm">({mathError.severity})</span>
                    </div>
                    {mathError.lineStart && (
                      <span className="text-sm opacity-70">
                        Line {mathError.lineStart}
                        {mathError.lineEnd && mathError.lineEnd !== mathError.lineStart && 
                          `-${mathError.lineEnd}`}
                      </span>
                    )}
                  </div>
                  
                  <div className="mb-2">
                    <span className="text-sm font-medium">Highlighted text:</span>
                    <p className="mt-1 font-mono text-sm bg-white bg-opacity-50 p-2 rounded">
                      "{mathError.highlightedText}"
                    </p>
                  </div>
                  
                  <p className="text-sm">{mathError.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}