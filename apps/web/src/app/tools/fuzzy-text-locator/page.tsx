'use client';

import { useState } from 'react';
import { fuzzyTextLocatorTool, TextLocationFinderOutput } from '@roast/ai';
import { runToolWithAuth } from '@/app/tools/utils/runToolWithAuth';

const checkToolPath = fuzzyTextLocatorTool.config?.path || '/api/tools/fuzzy-text-locator';

export default function FuzzyTextLocatorPage() {
  const [documentText, setDocumentText] = useState('');
  const [targetText, setTargetText] = useState('');
  const [result, setResult] = useState<TextLocationFinderOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!documentText.trim() || !targetText.trim()) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await runToolWithAuth(checkToolPath, { 
        documentText,
        searchText: targetText 
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Fuzzy Text Locator</h1>
        <p className="text-gray-600">
          Find text in documents using fuzzy matching algorithms.
        </p>
      </div>

      <div className="space-y-6">
        <div>
          <label htmlFor="documentText" className="block text-sm font-medium text-gray-700 mb-2">
            Document Text
          </label>
          <textarea
            id="documentText"
            rows={8}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            placeholder="Enter the document text to search in..."
            value={documentText}
            onChange={(e) => setDocumentText(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="targetText" className="block text-sm font-medium text-gray-700 mb-2">
            Text to Find
          </label>
          <textarea
            id="targetText"
            rows={3}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            placeholder="Enter the text you want to find..."
            value={targetText}
            onChange={(e) => setTargetText(e.target.value)}
          />
        </div>

        <button
          onClick={handleSearch}
          disabled={isLoading || !documentText.trim() || !targetText.trim()}
          className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Searching...' : 'Search'}
        </button>

        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {result && (
          <div className="space-y-4">
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Search Result</h2>
              {result.found ? (
                <div className="space-y-2">
                  <p className="text-green-600 font-medium">✓ Text found</p>
                  {result.location && (
                    <div className="bg-gray-50 p-3 rounded">
                      <p className="text-sm text-gray-600">
                        <strong>Position:</strong> Characters {result.location.startOffset} - {result.location.endOffset}
                      </p>
                      <p className="text-sm text-gray-600">
                        <strong>Confidence:</strong> {Math.round((result.location.confidence || 0) * 100)}%
                      </p>
                      <p className="text-sm text-gray-600 mt-2">
                        <strong>Found text:</strong> <code className="bg-white px-1">{result.location.quotedText}</code>
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-red-600">✗ Text not found</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
