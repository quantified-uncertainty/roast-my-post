'use client';

import { useState } from 'react';
import { ToolPageTemplate } from '@/components/tools/form-generators/ToolPageTemplate';
import documentChunkerTool from '@/tools/document-chunker';
import type { DocumentChunkerInput, DocumentChunkerOutput } from '@/tools/document-chunker';

const sampleDocuments = {
  markdown: `# Introduction to Machine Learning

Machine learning is a subset of artificial intelligence that enables systems to learn and improve from experience without being explicitly programmed.

## Types of Machine Learning

### Supervised Learning
In supervised learning, the algorithm learns from labeled training data. Each example in the training set consists of an input object and a desired output value.

Common algorithms include:
- Linear Regression
- Decision Trees
- Neural Networks

### Unsupervised Learning
Unsupervised learning algorithms work with unlabeled data, discovering hidden patterns or structures within the data.

Examples include:
- K-means clustering
- Principal Component Analysis (PCA)
- Autoencoders

## Applications

Machine learning has numerous applications across various domains:

1. **Healthcare**: Disease diagnosis, drug discovery, personalized treatment
2. **Finance**: Fraud detection, algorithmic trading, credit scoring
3. **Transportation**: Autonomous vehicles, route optimization, traffic prediction

## Code Example

\`\`\`python
from sklearn.linear_model import LinearRegression
import numpy as np

# Sample data
X = np.array([[1], [2], [3], [4], [5]])
y = np.array([2, 4, 6, 8, 10])

# Create and train model
model = LinearRegression()
model.fit(X, y)

# Make predictions
predictions = model.predict([[6], [7]])
print(f"Predictions: {predictions}")
\`\`\`

## Conclusion

Machine learning continues to revolutionize how we approach complex problems, enabling computers to learn from data and make intelligent decisions.`,

  technical: `The quantum entanglement phenomenon demonstrates non-local correlations between particles. When two particles become entangled, measuring the state of one particle instantly affects the state of the other, regardless of the distance between them. This "spooky action at a distance," as Einstein called it, has been experimentally verified through Bell inequality violations. The implications for quantum computing are profound: entangled qubits can perform parallel computations exponentially faster than classical bits. Current research focuses on maintaining coherence times and reducing decoherence through error correction codes and topological quantum computing approaches.`,

  mixed: `In today's analysis, we'll examine the market performance of tech stocks. AAPL showed a 3.2% increase, reaching $195.83. This represents a 15% gain over the past quarter.

The calculation for portfolio return is:
Portfolio Return = (End Value - Start Value) / Start Value × 100
= ($125,000 - $100,000) / $100,000 × 100
= 25%

Key factors influencing the market include:
• Federal Reserve interest rate decisions
• Q3 earnings reports exceeding expectations
• Growing AI adoption in enterprise

Looking forward, analysts predict continued volatility with a 60% probability of reaching new highs by year-end.`,
};

export default function DocumentChunkerPage() {
  const [selectedExample, setSelectedExample] = useState<keyof typeof sampleDocuments>('markdown');

  const formConfig = {
    fieldOrder: ['text', 'strategy', 'targetWords', 'maxChunkSize', 'minChunkSize', 'overlap', 'preserveContext'] as ('text' | 'strategy' | 'targetWords' | 'maxChunkSize' | 'minChunkSize' | 'overlap' | 'preserveContext')[],
    fieldConfigs: {
      text: {
        label: 'Document Text',
        placeholder: 'Paste your document here...',
        rows: 10,
      },
      strategy: {
        label: 'Chunking Strategy',
        helpText: 'Choose the chunking strategy based on your document type',
      },
      targetWords: {
        label: 'Target Words (Markdown)',
        helpText: 'Target word count per chunk for recursive markdown chunking',
      },
      maxChunkSize: {
        label: 'Maximum Chunk Size',
        helpText: 'Maximum number of characters per chunk',
      },
      minChunkSize: {
        label: 'Minimum Chunk Size',
        helpText: 'Minimum number of characters per chunk',
      },
      overlap: {
        label: 'Overlap Size',
        helpText: 'Number of characters to overlap between chunks',
      },
      preserveContext: {
        label: 'Preserve Context',
        helpText: 'Try to preserve semantic context when chunking',
      },
    },
    submitButtonText: 'Chunk Document',
    examples: [
      {
        name: 'Markdown Document',
        description: 'Technical documentation with headers and code',
        data: {
          text: sampleDocuments.markdown,
          strategy: 'markdown' as const,
          targetWords: 500,
          maxChunkSize: 1500,
          minChunkSize: 200,
          overlap: 100,
          preserveContext: true,
        },
      },
      {
        name: 'Technical Paper',
        description: 'Dense technical content',
        data: {
          text: sampleDocuments.technical,
          strategy: 'semantic' as const,
          targetWords: 500,
          maxChunkSize: 1000,
          minChunkSize: 300,
          overlap: 150,
          preserveContext: true,
        },
      },
      {
        name: 'Mixed Content',
        description: 'Document with various content types',
        data: {
          text: sampleDocuments.mixed,
          strategy: 'hybrid' as const,
          targetWords: 500,
          maxChunkSize: 1200,
          minChunkSize: 200,
          overlap: 100,
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
            <p className="text-2xl font-bold capitalize">{output.metadata.strategy}</p>
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