'use client';

import { useState } from 'react';
import { DocumentTextIcon } from '@heroicons/react/24/outline';
import { documentChunkerTool, toolSchemas, getToolReadme, type DocumentChunkerOutput } from '@roast/ai';
import { runToolWithAuth } from '@/app/tools/utils/runToolWithAuth';
import { TabbedToolPageLayout } from '../components/TabbedToolPageLayout';
import { ToolDocumentation } from '../components/ToolDocumentation';
import { ErrorDisplay, SubmitButton, TextAreaField } from '../components/common';

export default function DocumentChunkerPage() {
  const [text, setText] = useState('');
  const [maxChunkSize, setMaxChunkSize] = useState(1000);
  const [overlap, setOverlap] = useState(100);
  const [result, setResult] = useState<DocumentChunkerOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Get schemas from centralized registry
  const { inputSchema, outputSchema } = toolSchemas[documentChunkerTool.config.id as keyof typeof toolSchemas];

  const handleChunk = async () => {
    if (!text.trim()) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await runToolWithAuth<{ text: string; maxChunkSize?: number; overlap?: number }, DocumentChunkerOutput>(
        '/api/tools/document-chunker', 
        { text, maxChunkSize, overlap }
      );
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const exampleText = `# Introduction to Machine Learning

Machine learning is a subset of artificial intelligence that focuses on developing systems that can learn from data. Unlike traditional programming where explicit instructions are provided, machine learning algorithms build mathematical models based on training data to make predictions or decisions.

## Types of Machine Learning

There are three main types of machine learning:

1. **Supervised Learning**: The algorithm learns from labeled training data, where each example has an input and a desired output. Common applications include classification and regression.

2. **Unsupervised Learning**: The algorithm finds patterns in unlabeled data without predefined categories. Clustering and dimensionality reduction are typical unsupervised learning tasks.

3. **Reinforcement Learning**: The algorithm learns through interaction with an environment, receiving rewards or penalties for its actions. This approach is commonly used in robotics and game playing.

## Applications

Machine learning has numerous real-world applications including natural language processing, computer vision, recommendation systems, and autonomous vehicles.`;

  // Try tab content
  const tryContent = (
    <div className="space-y-6">
      <form onSubmit={(e) => { e.preventDefault(); handleChunk(); }} className="space-y-6 bg-white p-6 rounded-lg shadow-sm border">
        <div>
          <label htmlFor="text" className="block text-sm font-medium text-gray-700 mb-1">
            Document Text <span className="text-red-500">*</span>
          </label>
          <textarea
            id="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-xs"
            rows={10}
            placeholder="Enter or paste your document text here..."
            required
          />
          <button
            type="button"
            onClick={() => setText(exampleText)}
            className="mt-2 text-sm text-indigo-600 hover:text-indigo-500"
          >
            Load example document
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="maxChunkSize" className="block text-sm font-medium text-gray-700 mb-1">
              Max Chunk Size (characters)
            </label>
            <input
              id="maxChunkSize"
              type="number"
              value={maxChunkSize}
              onChange={(e) => setMaxChunkSize(parseInt(e.target.value) || 1000)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              min="100"
              max="10000"
            />
          </div>

          <div>
            <label htmlFor="overlap" className="block text-sm font-medium text-gray-700 mb-1">
              Overlap (characters)
            </label>
            <input
              id="overlap"
              type="number"
              value={overlap}
              onChange={(e) => setOverlap(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              min="0"
              max="500"
            />
          </div>
        </div>

        <SubmitButton
          isLoading={isLoading}
          disabled={!text.trim()}
          text="Chunk Document"
          loadingText="Processing..."
        />
      </form>

      <ErrorDisplay error={error} />

      {result && (
        <div className="mt-8 space-y-6">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Chunking Results</h2>
            
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center p-3 bg-gray-50 rounded">
                <p className="text-2xl font-bold text-gray-900">{result.chunks.length}</p>
                <p className="text-sm text-gray-600">Chunks</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded">
                <p className="text-2xl font-bold text-gray-900">
                  {result.chunks.reduce((sum, chunk) => sum + chunk.text.length, 0)}
                </p>
                <p className="text-sm text-gray-600">Total Characters</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded">
                <p className="text-2xl font-bold text-gray-900">
                  {result.metadata.averageChunkSize}
                </p>
                <p className="text-sm text-gray-600">Avg Chunk Size</p>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">Document Chunks:</h3>
              {result.chunks.map((chunk, index) => (
                <div key={index} className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-sm">Chunk {index + 1}</span>
                    <span className="text-xs text-gray-500">
                      {chunk.startOffset} - {chunk.endOffset} ({chunk.text.length} chars)
                    </span>
                  </div>
                  <pre className="text-xs bg-white p-3 rounded border overflow-x-auto whitespace-pre-wrap">
                    {chunk.text}
                  </pre>
                  {chunk.metadata && (
                    <div className="mt-2 text-xs text-gray-600">
                      Metadata: {JSON.stringify(chunk.metadata)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // README content from generated file
  const readmeContent = getToolReadme(documentChunkerTool.config.id);

  // Docs tab content
  const docsContent = (
    <ToolDocumentation 
      toolId={documentChunkerTool.config.id}
      inputSchema={inputSchema}
      outputSchema={outputSchema}
      readmeContent={readmeContent}
    />
  );

  return (
    <TabbedToolPageLayout
      title={documentChunkerTool.config.name}
      description={documentChunkerTool.config.description}
      icon={<DocumentTextIcon className="h-8 w-8 text-indigo-600" />}
      tryContent={tryContent}
      docsContent={docsContent}
    />
  );
}