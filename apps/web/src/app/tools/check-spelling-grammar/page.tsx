'use client';

import { useState } from 'react';
import { CheckCircleIcon, XCircleIcon, ExclamationTriangleIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { checkSpellingGrammarTool, toolSchemas, getToolReadme } from '@roast/ai';
import { TabbedToolPageLayout } from '../components/TabbedToolPageLayout';
import { ToolDocumentation } from '../components/ToolDocumentation';
import { ErrorDisplay, SubmitButton, TextAreaField } from '../components/common';
import { useToolExecution } from '../hooks/useToolExecution';
import type { CheckSpellingGrammarOutput } from '@roast/ai';

const severityConfig = {
  critical: {
    icon: XCircleIcon,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-l-red-600',
  },
  major: {
    icon: ExclamationTriangleIcon,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-l-orange-600',
  },
  minor: {
    icon: ExclamationTriangleIcon,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-l-yellow-600',
  },
} as const;

// Get examples from tool config or use defaults
const examples = (checkSpellingGrammarTool.config as any).examples || [
  "Their going to there house over they're.",
  "The cat chased it's tail around the house.",
  "Me and him went to the store yesterday.",
  "I could of gone to the party but I was to tired.",
  "The data shows that sales has increased significantly."
];

function renderResult(result: CheckSpellingGrammarOutput) {
  const hasErrors = result.errors && result.errors.length > 0;
  
  return (
    <>
      {result.metadata && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Analysis Summary</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Total Errors:</span>
              <span className="text-sm font-medium">{result.metadata.totalErrorsFound}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Convention:</span>
              <span className="text-sm font-medium">{result.metadata.convention}</span>
            </div>
            {result.metadata.processingTime && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Processing Time:</span>
                <span className="text-sm font-medium">{result.metadata.processingTime}ms</span>
              </div>
            )}
          </div>
        </div>
      )}

      {hasErrors ? (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Errors Found</h2>
          <div className="space-y-4">
            {result.errors.map((error, index) => {
              const severity = error.importance > 70 ? 'critical' : error.importance > 40 ? 'major' : 'minor';
              const config = severityConfig[severity];
              const Icon = config.icon;
              
              return (
                <div key={index} className={`p-4 rounded-lg ${config.bgColor} border-l-4 ${config.borderColor}`}>
                  <div className="flex items-start">
                    <Icon className={`h-5 w-5 ${config.color} mt-0.5 mr-3 flex-shrink-0`} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-sm font-medium ${config.color}`}>
                          {error.type === 'spelling' ? 'Spelling' : 'Grammar'} Error
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-full ${config.bgColor} ${config.color}`}>
                          {severity}
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-700 mb-2">
                        <strong>Found:</strong> "{error.text}"
                      </p>
                      
                      {error.correction && (
                        <p className="text-sm text-gray-700 mb-2">
                          <strong>Suggestion:</strong> "{error.correction}"
                        </p>
                      )}
                      
                      {error.description && (
                        <p className="text-sm text-gray-600 italic">{error.description}</p>
                      )}
                      
                      {error.lineNumber && (
                        <p className="text-xs text-gray-500 mt-2">
                          Line: {error.lineNumber}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-center">
            <CheckCircleIcon className="h-6 w-6 text-green-600 mr-3" />
            <div>
              <h3 className="text-lg font-medium text-green-900">No Errors Found</h3>
              <p className="text-sm text-green-700 mt-1">
                Your text appears to be free of spelling and grammar errors.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Corrected text can be generated from the errors if needed */}
    </>
  );
}

export default function CheckSpellingGrammarPage() {
  const [text, setText] = useState('');
  
  // Get schemas from centralized registry
  const { inputSchema, outputSchema } = toolSchemas[checkSpellingGrammarTool.config.id as keyof typeof toolSchemas];

  // Use the hook for state management and execution
  const { result, isLoading, error, execute } = useToolExecution<
    { text: string },
    CheckSpellingGrammarOutput
  >('/api/tools/check-spelling-grammar', {
    validateInput: (input) => {
      if (!input.text.trim()) return 'Please enter some text to check';
      if (input.text.length < 3) return 'Text must be at least 3 characters long';
      return true;
    },
    formatError: (err) => `Spelling/grammar check failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
    onExecuteComplete: (result) => {
      if (result && result.metadata) {
        console.log(`Found ${result.metadata.totalErrorsFound} errors`);
      }
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    execute({ text });
  };

  // Try tab content (form and results)
  const tryContent = (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow-sm border">
        <TextAreaField
          id="text"
          label="Text to Check"
          value={text}
          onChange={setText}
          placeholder="Enter or paste your text here to check for spelling and grammar errors..."
          rows={10}
          disabled={isLoading}
          required
        />

        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Example texts:</p>
          <div className="space-y-2">
            {examples.map((example: string, i: number) => (
              <button
                key={i}
                type="button"
                onClick={() => setText(example)}
                disabled={isLoading}
                className="block w-full text-left px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 disabled:bg-gray-200 disabled:cursor-not-allowed rounded border text-gray-700 transition-colors"
              >
                {example}
              </button>
            ))}
          </div>
        </div>

        <SubmitButton
          isLoading={isLoading}
          disabled={!text.trim()}
          text="Check Text"
          loadingText="Checking Text..."
        />
      </form>

      <ErrorDisplay error={error} />

      {result && (
        <div className="mt-8">
          {renderResult(result)}
        </div>
      )}
    </div>
  );

  // README content from generated file
  const readmeContent = getToolReadme(checkSpellingGrammarTool.config.id);

  // Docs tab content
  const docsContent = (
    <ToolDocumentation 
      toolId={checkSpellingGrammarTool.config.id}
      inputSchema={inputSchema}
      outputSchema={outputSchema}
      readmeContent={readmeContent}
    />
  );

  return (
    <TabbedToolPageLayout
      title={checkSpellingGrammarTool.config.name}
      description={checkSpellingGrammarTool.config.description}
      icon={<DocumentTextIcon className="h-8 w-8 text-indigo-600" />}
      warning="This tool uses AI to detect errors and may not catch every issue. Always review suggestions carefully, especially for specialized or technical content."
      tryContent={tryContent}
      docsContent={docsContent}
    />
  );
}