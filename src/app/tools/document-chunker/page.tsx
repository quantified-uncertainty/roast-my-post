'use client';

import { ToolPageTemplate } from '@/components/tools/form-generators/ToolPageTemplate';
import documentChunkerTool from '@/tools/document-chunker';
import type { DocumentChunkerOutput } from '@/tools/document-chunker';
import {
  technicalDocumentation,
  academicPaper,
  tutorialGuide,
  policyDocument,
  researchReport,
  mixedContent,
} from './examples';

export default function DocumentChunkerPage() {

  const formConfig = {
    fieldOrder: ['text', 'targetWords', 'maxChunkSize', 'minChunkSize', 'preserveContext'] as ('text' | 'targetWords' | 'maxChunkSize' | 'minChunkSize' | 'preserveContext')[],
    fieldConfigs: {
      text: {
        label: 'Document Text',
        placeholder: 'Paste your document here...',
        rows: 10,
      },
      targetWords: {
        label: 'Target Words per Chunk',
        helpText: 'Target word count per chunk (documents are split by markdown sections)',
      },
      maxChunkSize: {
        label: 'Maximum Chunk Size',
        helpText: 'Maximum number of characters per chunk',
      },
      minChunkSize: {
        label: 'Minimum Chunk Size',
        helpText: 'Minimum number of characters per chunk',
      },
      preserveContext: {
        label: 'Preserve Context',
        helpText: 'Try to preserve semantic context when chunking',
      },
    },
    submitButtonText: 'Chunk Document',
    examples: [
      {
        name: 'API Documentation',
        description: 'Technical documentation with authentication, endpoints, and code examples',
        data: {
          text: technicalDocumentation,
          targetWords: 400,
          maxChunkSize: 1500,
          minChunkSize: 200,
          preserveContext: true,
        },
      },
      {
        name: 'Academic Paper',
        description: 'Research paper on climate prediction with methodology and results',
        data: {
          text: academicPaper,
          targetWords: 450,
          maxChunkSize: 1800,
          minChunkSize: 300,
          preserveContext: true,
        },
      },
      {
        name: 'Tutorial Guide',
        description: 'Step-by-step web development tutorial with code samples',
        data: {
          text: tutorialGuide,
          targetWords: 500,
          maxChunkSize: 2000,
          minChunkSize: 250,
          preserveContext: true,
        },
      },
      {
        name: 'Policy Document',
        description: 'Formal policy with numbered sections and procedures',
        data: {
          text: policyDocument,
          targetWords: 350,
          maxChunkSize: 1500,
          minChunkSize: 200,
          preserveContext: true,
        },
      },
      {
        name: 'Research Report',
        description: 'Market analysis with data, projections, and technical insights',
        data: {
          text: researchReport,
          targetWords: 400,
          maxChunkSize: 1600,
          minChunkSize: 300,
          preserveContext: true,
        },
      },
      {
        name: 'Financial Report',
        description: 'Quarterly earnings with metrics, tables, and code examples',
        data: {
          text: mixedContent,
          targetWords: 450,
          maxChunkSize: 1800,
          minChunkSize: 250,
          preserveContext: true,
        },
      },
    ],
  };

  const renderResults = (output: DocumentChunkerOutput) => (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold mb-4">Chunking Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-600">Total Chunks</p>
            <p className="text-2xl font-bold">{output.metadata.totalChunks}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Average Size</p>
            <p className="text-2xl font-bold">{output.metadata.averageChunkSize}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Strategy</p>
            <p className="text-2xl font-bold">Markdown</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Warnings</p>
            <p className="text-2xl font-bold">{output.metadata.warnings?.length || 0}</p>
          </div>
        </div>
        
        {output.metadata.warnings && output.metadata.warnings.length > 0 && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
            <p className="text-sm font-medium text-yellow-800">Warnings:</p>
            <ul className="mt-1 text-sm text-yellow-700">
              {output.metadata.warnings.map((warning, idx) => (
                <li key={idx}>• {warning}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Chunk Distribution Chart */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold mb-4">Chunk Size Distribution</h3>
        <div className="space-y-2">
          {output.chunks.map((chunk, idx) => {
            const percentage = (chunk.text.length / 2000) * 100; // Assuming max 2000 chars for visualization
            return (
              <div key={chunk.id} className="flex items-center gap-2">
                <span className="text-xs text-gray-600 w-12">{idx + 1}</span>
                <div className="flex-1 bg-gray-200 rounded-full h-4 relative">
                  <div
                    className="bg-blue-500 h-full rounded-full"
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                  />
                </div>
                <span className="text-xs text-gray-600 w-16 text-right">
                  {chunk.text.length}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detailed Chunks */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Chunk Details</h3>
        {output.chunks.map((chunk, idx) => (
          <div key={chunk.id} className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h4 className="font-medium">Chunk {idx + 1}</h4>
                <p className="text-xs text-gray-600">
                  Lines {chunk.startLine}-{chunk.endLine} • 
                  Characters {chunk.startOffset}-{chunk.endOffset} • 
                  {chunk.text.length} chars
                </p>
              </div>
              <div className="text-right">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  chunk.metadata.confidence > 0.8 
                    ? 'bg-green-100 text-green-800' 
                    : chunk.metadata.confidence > 0.6 
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {Math.round(chunk.metadata.confidence * 100)}% confidence
                </span>
                {chunk.metadata.type && (
                  <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {chunk.metadata.type}
                  </span>
                )}
              </div>
            </div>
            
            {chunk.metadata.headingContext && chunk.metadata.headingContext.length > 0 && (
              <div className="mb-2 text-xs text-gray-600">
                <span className="font-medium">Context:</span> {chunk.metadata.headingContext.join(' › ')}
              </div>
            )}
            
            <div className="mt-2 p-3 bg-gray-50 rounded text-sm font-mono whitespace-pre-wrap max-h-40 overflow-y-auto">
              {chunk.text}
            </div>
            
            <div className="mt-2 flex items-center gap-4 text-xs text-gray-600">
              <span>Complete: {chunk.metadata.isComplete ? '✓' : '✗'}</span>
              <span>Words: {chunk.text.split(/\s+/).length}</span>
              <span>Sentences: {(chunk.text.match(/[.!?]+/g) || []).length}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <ToolPageTemplate
      tool={documentChunkerTool}
      renderResults={renderResults}
      formConfig={formConfig}
    />
  );
}