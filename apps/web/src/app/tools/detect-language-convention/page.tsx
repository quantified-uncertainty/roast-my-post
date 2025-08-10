'use client';

import { useState } from 'react';
import { LanguageIcon } from '@heroicons/react/24/outline';
import { detectLanguageConventionTool, toolSchemas, getToolReadme } from '@roast/ai';
import { runToolWithAuth } from '@/app/tools/utils/runToolWithAuth';
import { TabbedToolPageLayout } from '../components/TabbedToolPageLayout';
import { ToolDocumentation } from '../components/ToolDocumentation';

interface LanguageConventionResult {
  convention: 'US' | 'UK' | 'UNKNOWN';
  confidence: number;
  reasoning: string;
  indicators: {
    spelling?: string[];
    vocabulary?: string[];
    grammar?: string[];
    punctuation?: string[];
    dateFormat?: string[];
  };
}

export default function DetectLanguageConventionPage() {
  const [text, setText] = useState('');
  const [result, setResult] = useState<LanguageConventionResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Get schemas from centralized registry
  const { inputSchema, outputSchema } = toolSchemas[detectLanguageConventionTool.config.id as keyof typeof toolSchemas];

  const handleDetect = async () => {
    if (!text.trim()) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await runToolWithAuth<{ text: string }, LanguageConventionResult>('/api/tools/detect-language-convention', { text });
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const exampleTexts = [
    { label: 'US English', text: 'The organization analyzed the color of the aluminum samples from the center of the data.' },
    { label: 'UK English', text: 'The organisation analysed the colour of the aluminium samples from the centre of the data.' },
    { label: 'Mixed', text: 'The organization analysed the color of the aluminium samples from the center of the data.' }
  ];

  const getConventionColor = (convention: string) => {
    switch (convention) {
      case 'US':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'UK':
        return 'bg-red-50 border-red-200 text-red-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  // Try tab content
  const tryContent = (
    <div className="space-y-6">
      <form onSubmit={(e) => { e.preventDefault(); handleDetect(); }} className="space-y-6 bg-white p-6 rounded-lg shadow-sm border">
        <div>
          <label htmlFor="text" className="block text-sm font-medium text-gray-700 mb-1">
            Text to Analyze <span className="text-red-500">*</span>
          </label>
          <textarea
            id="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            rows={6}
            placeholder="Enter text to detect whether it uses US or UK English conventions..."
            required
          />
        </div>

        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Example texts:</p>
          <div className="space-y-2">
            {exampleTexts.map((example, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setText(example.text)}
                className="block w-full text-left px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded border text-gray-700 transition-colors"
              >
                <span className="font-medium">{example.label}:</span> {example.text}
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading || !text.trim()}
          className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Analyzing...' : 'Detect Convention'}
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
            <h2 className="text-lg font-medium text-gray-900 mb-4">Detection Result</h2>
            
            <div className={`p-4 rounded-lg border ${getConventionColor(result.convention)}`}>
              <div className="flex items-center justify-between mb-3">
                <p className="font-semibold text-lg">
                  {result.convention === 'US' ? '🇺🇸 US English' : 
                   result.convention === 'UK' ? '🇬🇧 UK English' : 
                   '❓ Unknown/Mixed'}
                </p>
                <span className="text-sm">
                  Confidence: {Math.round(result.confidence * 100)}%
                </span>
              </div>
              
              <p className="text-sm mb-4">{result.reasoning}</p>
              
              {Object.entries(result.indicators).length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-medium">Indicators found:</p>
                  {result.indicators.spelling && result.indicators.spelling.length > 0 && (
                    <div className="text-sm">
                      <span className="font-medium">Spelling:</span> {result.indicators.spelling.join(', ')}
                    </div>
                  )}
                  {result.indicators.vocabulary && result.indicators.vocabulary.length > 0 && (
                    <div className="text-sm">
                      <span className="font-medium">Vocabulary:</span> {result.indicators.vocabulary.join(', ')}
                    </div>
                  )}
                  {result.indicators.grammar && result.indicators.grammar.length > 0 && (
                    <div className="text-sm">
                      <span className="font-medium">Grammar:</span> {result.indicators.grammar.join(', ')}
                    </div>
                  )}
                  {result.indicators.punctuation && result.indicators.punctuation.length > 0 && (
                    <div className="text-sm">
                      <span className="font-medium">Punctuation:</span> {result.indicators.punctuation.join(', ')}
                    </div>
                  )}
                  {result.indicators.dateFormat && result.indicators.dateFormat.length > 0 && (
                    <div className="text-sm">
                      <span className="font-medium">Date Format:</span> {result.indicators.dateFormat.join(', ')}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // README content from generated file
  const readmeContent = getToolReadme(detectLanguageConventionTool.config.id);

  // Docs tab content
  const docsContent = (
    <ToolDocumentation 
      toolId={detectLanguageConventionTool.config.id}
      inputSchema={inputSchema}
      outputSchema={outputSchema}
      readmeContent={readmeContent}
    />
  );

  return (
    <TabbedToolPageLayout
      title={detectLanguageConventionTool.config.name}
      description={detectLanguageConventionTool.config.description}
      icon={<LanguageIcon className="h-8 w-8 text-indigo-600" />}
      tryContent={tryContent}
      docsContent={docsContent}
    />
  );
}