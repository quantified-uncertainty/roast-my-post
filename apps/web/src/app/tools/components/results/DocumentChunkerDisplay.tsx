import React from 'react';
import { DocumentTextIcon } from '@heroicons/react/24/outline';
import type { DocumentChunkerOutput } from '@roast/ai';

interface DocumentChunkerDisplayProps {
  result: DocumentChunkerOutput;
  className?: string;
}

export function DocumentChunkerDisplay({ result, className = '' }: DocumentChunkerDisplayProps) {
  if (!result.chunks || result.chunks.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <p className="text-yellow-800">No chunks generated. The document may be too short.</p>
      </div>
    );
  }

  // Calculate summary stats
  const totalChunks = result.chunks.length;
  const totalText = result.chunks.map(c => c.text).join('');
  const totalCharacters = totalText.length;
  const totalWords = totalText.split(/\s+/).filter(w => w).length;
  const averageChunkSize = Math.round(totalCharacters / totalChunks);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Summary */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Chunking Summary</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-gray-50 rounded">
            <p className="text-2xl font-bold text-gray-900">{totalChunks}</p>
            <p className="text-xs text-gray-500">Total Chunks</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded">
            <p className="text-2xl font-bold text-gray-900">{totalWords.toLocaleString()}</p>
            <p className="text-xs text-gray-500">Total Words</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded">
            <p className="text-2xl font-bold text-gray-900">{totalCharacters.toLocaleString()}</p>
            <p className="text-xs text-gray-500">Total Characters</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded">
            <p className="text-2xl font-bold text-gray-900">{averageChunkSize}</p>
            <p className="text-xs text-gray-500">Avg Chunk Size</p>
          </div>
        </div>
      </div>

      {/* Chunks */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Document Chunks</h2>
        <div className="space-y-4">
          {result.chunks.map((chunk, index) => {
            const wordCount = chunk.text.split(/\s+/).filter(w => w).length;
            const charCount = chunk.text.length;
            
            return (
              <div key={index} className="border rounded-lg">
                <div className="bg-gray-50 px-4 py-2 border-b flex items-center justify-between">
                  <div className="flex items-center">
                    <DocumentTextIcon className="h-4 w-4 text-gray-500 mr-2" />
                    <span className="text-sm font-medium text-gray-700">
                      Chunk {index + 1} of {totalChunks}
                    </span>
                  </div>
                  <div className="flex gap-4 text-xs text-gray-500">
                    <span>Lines: {chunk.startLine}-{chunk.endLine}</span>
                    <span>{wordCount} words</span>
                    <span>{charCount} characters</span>
                    {chunk.metadata?.type && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">
                        {chunk.metadata.type}
                      </span>
                    )}
                  </div>
                </div>
                <div className="p-4">
                  {chunk.metadata?.headingContext && chunk.metadata.headingContext.length > 0 && (
                    <div className="mb-2 text-xs text-gray-500">
                      Context: {chunk.metadata.headingContext.join(' > ')}
                    </div>
                  )}
                  <pre className="whitespace-pre-wrap font-mono text-xs text-gray-700 bg-gray-50 p-3 rounded overflow-x-auto">
                    {chunk.text}
                  </pre>
                  {chunk.metadata && (
                    <div className="mt-2 flex gap-4 text-xs text-gray-500">
                      <span>Complete: {chunk.metadata.isComplete ? '✓' : '✗'}</span>
                      <span>Confidence: {Math.round(chunk.metadata.confidence * 100)}%</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}