'use client';

import { useState } from 'react';
import { documentChunkerTool, DocumentChunkerOutput, toolSchemas } from '@roast/ai';
import { CodeBracketIcon, ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { runToolWithAuth } from '@/app/tools/utils/runToolWithAuth';

const checkToolPath = documentChunkerTool.config.path;

export default function DocumentChunkerPage() {
  const [text, setText] = useState('');
  const [result, setResult] = useState<DocumentChunkerOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showInputSchema, setShowInputSchema] = useState(false);
  const [showOutputSchema, setShowOutputSchema] = useState(false);
  
  // Get schemas from generated schemas
  const { inputSchema, outputSchema } = toolSchemas[documentChunkerTool.config.id as keyof typeof toolSchemas];

  const handleChunk = async () => {
    if (!text.trim()) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await runToolWithAuth<{ text: string }, DocumentChunkerOutput>(checkToolPath, { text });
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Document Chunker</h1>
        <p className="text-gray-600">
          Split documents into semantic chunks for processing.
        </p>
      </div>

      <div className="space-y-6">
        <div>
          <label htmlFor="text" className="block text-sm font-medium text-gray-700 mb-2">
            Enter document text
          </label>
          <textarea
            id="text"
            rows={10}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            placeholder="Enter your document text here..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </div>

        <button
          onClick={handleChunk}
          disabled={isLoading || !text.trim()}
          className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Processing...' : 'Chunk Document'}
        </button>

        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {result && (
          <div className="space-y-6">
            {result.metadata?.warnings && result.metadata.warnings.length > 0 && (
              <div className="bg-yellow-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-yellow-800 mb-2">Warnings</h3>
                {result.metadata.warnings.map((warning: string, idx: number) => (
                  <p key={idx} className="text-sm text-yellow-700">• {warning}</p>
                ))}
              </div>
            )}

            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                {result.chunks.length} Chunks Created
              </h2>
              <div className="space-y-4">
                {result.chunks.map((chunk: any, idx: number) => (
                  <div key={idx} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm font-medium text-gray-900">
                        Chunk {idx + 1}
                      </span>
                      <span className="text-xs text-gray-500">
                        {chunk.text?.length || 0} characters
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">
                      {chunk.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* API Documentation Section */}
      <div className="bg-white shadow rounded-lg mt-8">
        <div className="px-6 py-4 border-b">
          <div className="flex items-center gap-2">
            <CodeBracketIcon className="h-5 w-5 text-gray-600" />
            <h3 className="text-lg font-medium text-gray-900">API Documentation</h3>
          </div>
        </div>
        
        {/* Input Schema */}
        <div className="border-b">
          <button
            onClick={() => setShowInputSchema(!showInputSchema)}
            className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
          >
            <span className="font-medium text-gray-700">Input Schema</span>
            {showInputSchema ? (
              <ChevronDownIcon className="h-5 w-5 text-gray-400" />
            ) : (
              <ChevronRightIcon className="h-5 w-5 text-gray-400" />
            )}
          </button>
          {showInputSchema && (
            <div className="px-6 pb-4">
              <pre className="text-xs bg-gray-50 p-3 rounded overflow-x-auto">
                {JSON.stringify(inputSchema, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Output Schema */}
        <div>
          <button
            onClick={() => setShowOutputSchema(!showOutputSchema)}
            className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
          >
            <span className="font-medium text-gray-700">Output Schema</span>
            {showOutputSchema ? (
              <ChevronDownIcon className="h-5 w-5 text-gray-400" />
            ) : (
              <ChevronRightIcon className="h-5 w-5 text-gray-400" />
            )}
          </button>
          {showOutputSchema && (
            <div className="px-6 pb-4">
              <pre className="text-xs bg-gray-50 p-3 rounded overflow-x-auto">
                {JSON.stringify(outputSchema, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
