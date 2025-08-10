'use client';

import { useState } from 'react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { fuzzyTextLocatorTool, TextLocationFinderOutput, toolSchemas, getToolReadme } from '@roast/ai';
import { runToolWithAuth } from '@/app/tools/utils/runToolWithAuth';
import { TabbedToolPageLayout } from '../components/TabbedToolPageLayout';
import { ToolDocumentation } from '../components/ToolDocumentation';

const checkToolPath = fuzzyTextLocatorTool.config?.path || '/api/tools/fuzzy-text-locator';

export default function FuzzyTextLocatorPage() {
  const [documentText, setDocumentText] = useState('');
  const [targetText, setTargetText] = useState('');
  const [result, setResult] = useState<TextLocationFinderOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Get schemas from centralized registry
  const { inputSchema, outputSchema } = toolSchemas[fuzzyTextLocatorTool.config.id as keyof typeof toolSchemas];

  const handleSearch = async () => {
    if (!documentText.trim() || !targetText.trim()) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await runToolWithAuth<{ documentText: string; searchText: string }, TextLocationFinderOutput>(checkToolPath, { 
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

  // Try tab content (form and results)
  const tryContent = (
    <div className="space-y-6">
      <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }} className="space-y-6 bg-white p-6 rounded-lg shadow-sm border">
        <div>
          <label htmlFor="documentText" className="block text-sm font-medium text-gray-700 mb-1">
            Document Text <span className="text-red-500">*</span>
          </label>
          <textarea
            id="documentText"
            value={documentText}
            onChange={(e) => setDocumentText(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            rows={8}
            placeholder="Enter the document text to search in..."
            required
          />
        </div>

        <div>
          <label htmlFor="targetText" className="block text-sm font-medium text-gray-700 mb-1">
            Text to Find <span className="text-red-500">*</span>
          </label>
          <textarea
            id="targetText"
            value={targetText}
            onChange={(e) => setTargetText(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            rows={3}
            placeholder="Enter the text you want to find..."
            required
          />
        </div>

        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Example usage:</p>
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => {
                setDocumentText("The quick brown fox jumps over the lazy dog. This is a sample document with various text patterns.");
                setTargetText("brown fox");
              }}
              className="block w-full text-left px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded border text-gray-700 transition-colors"
            >
              Exact match: "brown fox"
            </button>
            <button
              type="button"
              onClick={() => {
                setDocumentText("The quick brown fox jumps over the lazy dog. This is a sample document with various text patterns.");
                setTargetText("brown foxe");
              }}
              className="block w-full text-left px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded border text-gray-700 transition-colors"
            >
              Fuzzy match: "brown foxe" (with typo)
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading || !documentText.trim() || !targetText.trim()}
          className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Searching...' : 'Search'}
        </button>
      </form>

      {error && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-800">Error: {error}</p>
        </div>
      )}

      {result && (
        <div className="mt-8">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Search Result</h2>
            {result.found ? (
              <div className="space-y-4">
                <p className="text-green-600 font-medium">✓ Text found successfully</p>
                {result.location && (
                  <div className="bg-gray-50 p-4 rounded">
                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div>
                        <p className="text-sm text-gray-600">
                          <strong>Start Position:</strong> {result.location.startOffset}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">
                          <strong>End Position:</strong> {result.location.endOffset}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">
                          <strong>Confidence:</strong> {Math.round((result.location.confidence || 0) * 100)}%
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">
                          <strong>Strategy:</strong> {result.location.strategy || 'N/A'}
                        </p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-2"><strong>Found text:</strong></p>
                      <code className="block bg-white p-2 rounded border text-sm">{result.location.quotedText}</code>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-red-600 font-medium">✗ Text not found</p>
                <p className="text-sm text-gray-600">The search text could not be located in the document. Try:
                  <br />• Checking for typos in the search text
                  <br />• Using a shorter or more specific search phrase
                  <br />• Searching for a partial match instead of the full text
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  // README content from generated file
  const readmeContent = getToolReadme(fuzzyTextLocatorTool.config.id as any);

  // Docs tab content
  const docsContent = (
    <ToolDocumentation 
      toolId={fuzzyTextLocatorTool.config.id}
      inputSchema={inputSchema}
      outputSchema={outputSchema}
      readmeContent={readmeContent}
    />
  );

  return (
    <TabbedToolPageLayout
      title={fuzzyTextLocatorTool.config.name}
      description={fuzzyTextLocatorTool.config.description}
      icon={<MagnifyingGlassIcon className="h-8 w-8 text-indigo-600" />}
      tryContent={tryContent}
      docsContent={docsContent}
    />
  );
}
