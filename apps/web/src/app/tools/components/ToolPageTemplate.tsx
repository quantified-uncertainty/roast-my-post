'use client';

import { useState, ReactNode } from 'react';
import { runToolWithAuth } from '@/app/tools/utils/runToolWithAuth';

export interface ToolPageTemplateProps<TOutput> {
  title: string;
  description: string;
  inputLabel?: string;
  inputPlaceholder?: string;
  buttonText?: string;
  toolPath: string;
  renderResult: (result: TOutput) => ReactNode;
  prepareInput?: (text: string) => any;
  validateInput?: (text: string) => string | null;
  inputRows?: number;
}

export function ToolPageTemplate<TOutput>({
  title,
  description,
  inputLabel = "Enter text to analyze",
  inputPlaceholder = "Enter your text here...",
  buttonText = "Analyze",
  toolPath,
  renderResult,
  prepareInput = (text) => ({ text }),
  validateInput,
  inputRows = 10
}: ToolPageTemplateProps<TOutput>) {
  const [text, setText] = useState('');
  const [result, setResult] = useState<TOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    // Clear previous state
    setError(null);
    setResult(null);

    // Validate input
    if (!text.trim()) {
      setError('Please enter some text to analyze');
      return;
    }

    if (validateInput) {
      const validationError = validateInput(text);
      if (validationError) {
        setError(validationError);
        return;
      }
    }

    setIsLoading(true);

    try {
      const input = prepareInput(text);
      const response = await runToolWithAuth<any, TOutput>(toolPath, input);
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{title}</h1>
        <p className="text-gray-600">{description}</p>
      </div>

      <div className="space-y-6">
        <div>
          <label htmlFor="text-input" className="block text-sm font-medium text-gray-700 mb-2">
            {inputLabel}
          </label>
          <textarea
            id="text-input"
            rows={inputRows}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            placeholder={inputPlaceholder}
            value={text}
            onChange={(e) => setText(e.target.value)}
            aria-describedby={error ? "error-message" : undefined}
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={isLoading || !text.trim()}
          className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed"
          aria-busy={isLoading}
        >
          {isLoading ? `${buttonText}...` : buttonText}
        </button>

        {error && (
          <div id="error-message" className="rounded-md bg-red-50 p-4" role="alert">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {result && (
          <div aria-live="polite" aria-atomic="true">
            {renderResult(result)}
          </div>
        )}
      </div>
    </div>
  );
}