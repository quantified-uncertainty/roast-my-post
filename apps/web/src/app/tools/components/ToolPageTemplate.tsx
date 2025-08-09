'use client';

import { useState, ReactNode, ComponentType } from 'react';
import { runToolWithAuth } from '@/app/tools/utils/runToolWithAuth';
import { ToolErrorBoundary } from './ToolErrorBoundary';
import { InformationCircleIcon } from '@heroicons/react/24/outline';
import { ApiDocumentation } from './ApiDocumentation';
import { AgentInteraction } from './AgentInteraction';

export interface ToolPageTemplateProps<TInput = any, TOutput = any> {
  // Basic info
  title: string;
  description: string;
  icon?: ComponentType<{ className?: string }>;
  
  // Warning/info box
  warningMessage?: string;
  infoMessage?: string;
  
  // Input configuration
  inputLabel?: string;
  inputPlaceholder?: string;
  buttonText?: string;
  inputRows?: number;
  
  // Additional optional input field
  secondaryInput?: {
    label: string;
    placeholder: string;
    rows?: number;
  };
  
  // Examples
  examples?: string[];
  
  // Tool execution
  toolId: string;  // Just pass the tool ID, we'll derive the API path
  renderResult: (result: TOutput) => ReactNode;
  prepareInput?: (primaryText: string, secondaryText?: string) => TInput;
  validateInput?: (text: string) => string | null;
  
  // API Documentation
  inputSchema?: any;
  outputSchema?: any;
  showApiDocs?: boolean;
  extractLlmInteraction?: (result: TOutput) => any;
}

export function ToolPageTemplate<TInput = any, TOutput = any>({
  title,
  description,
  icon: Icon,
  warningMessage,
  infoMessage,
  inputLabel = "Enter text to analyze",
  inputPlaceholder = "Enter your text here...",
  buttonText = "Analyze",
  inputRows = 10,
  secondaryInput,
  examples,
  toolId,
  renderResult,
  prepareInput = (text: string) => ({ text } as TInput),
  validateInput,
  inputSchema,
  outputSchema,
  showApiDocs = true,
  extractLlmInteraction,
}: ToolPageTemplateProps<TInput, TOutput>) {
  const [primaryText, setPrimaryText] = useState('');
  const [secondaryText, setSecondaryText] = useState('');
  const [result, setResult] = useState<TOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastInput, setLastInput] = useState<TInput | null>(null);
  
  const apiPath = `/api/tools/${toolId}`;

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    // Clear previous state
    setError(null);
    setResult(null);

    // Validate input
    if (!primaryText.trim()) {
      setError('Please enter some text to analyze');
      return;
    }

    if (validateInput) {
      const validationError = validateInput(primaryText);
      if (validationError) {
        setError(validationError);
        return;
      }
    }

    setIsLoading(true);

    try {
      const input = prepareInput(primaryText, secondaryText);
      setLastInput(input);
      const response = await runToolWithAuth<TInput, TOutput>(apiPath, input);
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ToolErrorBoundary>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            {Icon && <Icon className="h-8 w-8 text-blue-600" />}
            <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
          </div>
          <p className="text-gray-600 mb-4">{description}</p>
          
          {warningMessage && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> {warningMessage}
              </p>
            </div>
          )}
          
          {infoMessage && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mt-4">
              <div className="flex">
                <InformationCircleIcon className="h-5 w-5 text-blue-600 mr-2 flex-shrink-0" />
                <p className="text-sm text-blue-800">{infoMessage}</p>
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 mb-8">
          <div>
            <label htmlFor="primary-input" className="block text-sm font-medium text-gray-700 mb-2">
              {inputLabel}
            </label>
            <textarea
              id="primary-input"
              rows={inputRows}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder={inputPlaceholder}
              value={primaryText}
              onChange={(e) => setPrimaryText(e.target.value)}
              required
            />
          </div>

          {secondaryInput && (
            <div>
              <label htmlFor="secondary-input" className="block text-sm font-medium text-gray-700 mb-2">
                {secondaryInput.label}
              </label>
              <textarea
                id="secondary-input"
                rows={secondaryInput.rows || 2}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder={secondaryInput.placeholder}
                value={secondaryText}
                onChange={(e) => setSecondaryText(e.target.value)}
              />
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !primaryText.trim()}
            className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? `${buttonText}...` : buttonText}
          </button>
        </form>

        {examples && examples.length > 0 && (
          <div className="mb-8">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Try these examples:</h3>
            <div className="flex flex-wrap gap-2">
              {examples.map((example, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => {
                    setPrimaryText(example);
                    setSecondaryText('');
                  }}
                  className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-md bg-red-50 p-4 mb-6">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {result && (
          <div className="space-y-6">
            {renderResult(result)}
            
            {/* Show agent interaction if available */}
            {extractLlmInteraction && (
              <AgentInteraction llmInteraction={extractLlmInteraction(result)} />
            )}
            
            {/* Show API documentation */}
            {showApiDocs && (inputSchema || outputSchema) && (
              <ApiDocumentation
                inputSchema={inputSchema}
                outputSchema={outputSchema}
                lastInput={lastInput}
                lastOutput={result}
                endpoint={apiPath}
                description="Use this endpoint to integrate the tool into your application."
              />
            )}
          </div>
        )}
      </div>
    </ToolErrorBoundary>
  );
}