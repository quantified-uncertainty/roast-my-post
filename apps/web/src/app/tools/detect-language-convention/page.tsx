'use client';

import { useState } from 'react';
import { LanguageIcon } from '@heroicons/react/24/outline';
import { detectLanguageConventionTool, toolSchemas, getToolReadme } from '@roast/ai';
import { TabbedToolPageLayout } from '../components/TabbedToolPageLayout';
import { ToolDocumentation } from '../components/ToolDocumentation';
import { ErrorDisplay, SubmitButton, TextAreaField } from '../components/common';
import { useToolExecution } from '../hooks/useToolExecution';
import { getConventionColor } from '../utils/resultFormatting';
import { toolExamples } from '../utils/exampleTexts';

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
  
  // Get schemas from centralized registry
  const { inputSchema, outputSchema } = toolSchemas[detectLanguageConventionTool.config.id as keyof typeof toolSchemas];

  // Use the hook for state management and execution
  const { result, isLoading, error, execute } = useToolExecution<
    { text: string },
    LanguageConventionResult
  >('/api/tools/detect-language-convention', {
    validateInput: (input) => input.text.trim().length > 0 || 'Please enter some text to analyze',
    formatError: (err) => `Language detection failed: ${err instanceof Error ? err.message : 'Unknown error'}`
  });

  const handleDetect = () => {
    execute({ text });
  };

  const exampleText = toolExamples['detect-language-convention'] as string;
  const exampleTexts = [
    { label: 'US English', text: 'The organization analyzed the color of the aluminum samples from the center of the data.' },
    { label: 'UK English', text: 'The organisation analysed the colour of the aluminium samples from the centre of the data.' },
    { label: 'Mixed', text: exampleText }
  ];

  // Try tab content
  const tryContent = (
    <div className="space-y-6">
      <form onSubmit={(e) => { e.preventDefault(); handleDetect(); }} className="space-y-6 bg-white p-6 rounded-lg shadow-sm border">
        <TextAreaField
          id="text"
          label="Text to Analyze"
          value={text}
          onChange={setText}
          placeholder="Enter text to detect whether it uses US or UK English conventions..."
          rows={6}
          required
        />

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

        <SubmitButton
          isLoading={isLoading}
          disabled={!text.trim()}
          text="Detect Convention"
          loadingText="Analyzing..."
        />
      </form>

      <ErrorDisplay error={error} />

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