#!/bin/bash

echo "Fixing remaining imports..."

# Fix test file imports
find apps/web/src/__tests__ -name "*.ts" -o -name "*.tsx" | xargs sed -i '' \
  -e "s|from '../../tools/|from '@roast/ai'|g" \
  -e "s|} from '@roast/ai'|} from '@roast/ai'|g"

# Fix documentAnalysis imports
find apps/web/src/lib/documentAnalysis -name "*.ts" -o -name "*.tsx" | xargs sed -i '' \
  -e "s|from '../../analysis-plugins/PluginManager'|from '@roast/ai'|g" \
  -e "s|from '../../analysis-plugins/TextChunk'|from '@roast/ai'|g" \
  -e "s|from '../../analysis-plugins/types'|from '@roast/ai'|g" \
  -e "s|from '../../analysis-plugins/types/plugin-types'|from '@roast/ai/analysis-plugins/types'|g" \
  -e "s|from '../../analysis-plugins/plugins/math'|from '@roast/ai'|g" \
  -e "s|from '../../analysis-plugins/utils/textHelpers'|from '@roast/ai/analysis-plugins/utils/textHelpers'|g" \
  -e "s|from '@/tools/fuzzy-text-locator/core'|from '@roast/ai/tools/fuzzy-text-locator/core'|g" \
  -e "s|from '@roast/ai/analysis-plugins/utils/textHelpers'|from '@roast/ai/analysis-plugins/utils/textHelpers'|g"

# Fix tool page imports for the remaining pages
cat > apps/web/src/app/tools/detect-language-convention/page.tsx << 'EOF'
'use client';

import { useState } from 'react';
import { detectLanguageConventionTool } from '@roast/ai';
import { runToolWithAuth } from '@/app/tools/utils/runToolWithAuth';

const checkToolPath = detectLanguageConventionTool.config.path;

export default function DetectLanguageConventionPage() {
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
      const response = await runToolWithAuth(checkToolPath, { text });
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Detect Language Convention</h1>
        <p className="text-gray-600">
          Analyze text to detect the language variant (US English, UK English, etc.).
        </p>
      </div>

      <div className="space-y-6">
        <div>
          <label htmlFor="text" className="block text-sm font-medium text-gray-700 mb-2">
            Enter text to analyze
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
          {isLoading ? 'Analyzing...' : 'Analyze Text'}
        </button>

        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {result && (
          <div className="space-y-6">
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Detected Convention</h2>
              <div className="space-y-2">
                <p className="text-2xl font-bold">{result.detectedConvention}</p>
                <p className="text-sm text-gray-600">Confidence: {Math.round(result.confidence * 100)}%</p>
              </div>
            </div>

            {result.indicators && result.indicators.length > 0 && (
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Indicators</h2>
                <ul className="space-y-2">
                  {result.indicators.map((indicator: any, index: number) => (
                    <li key={index} className="flex items-start">
                      <span className="text-sm text-gray-900">• {indicator.word}: {indicator.reason}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
EOF

# Fix document-chunker page
cat > apps/web/src/app/tools/document-chunker/page.tsx << 'EOF'
'use client';

import { useState } from 'react';
import { documentChunkerTool, DocumentChunkerOutput } from '@roast/ai';
import { runToolWithAuth } from '@/app/tools/utils/runToolWithAuth';

const checkToolPath = documentChunkerTool.config.path;

export default function DocumentChunkerPage() {
  const [text, setText] = useState('');
  const [result, setResult] = useState<DocumentChunkerOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChunk = async () => {
    if (!text.trim()) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await runToolWithAuth(checkToolPath, { text });
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
            {result.warnings && result.warnings.length > 0 && (
              <div className="bg-yellow-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-yellow-800 mb-2">Warnings</h3>
                {result.warnings.map((warning: string, idx: number) => (
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
                        {chunk.characterCount} characters
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">
                      {chunk.content}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
EOF

echo "Remaining import fixes completed!"