'use client';

import { useState } from 'react';
import { CalculatorIcon } from '@heroicons/react/24/outline';
import { checkMathTool, toolSchemas, getToolReadme } from '@roast/ai';
import { runToolWithAuth } from '@/app/tools/utils/runToolWithAuth';
import { TabbedToolPageLayout } from '../components/TabbedToolPageLayout';
import { ToolDocumentation } from '../components/ToolDocumentation';
import { ErrorDisplay, SubmitButton } from '../components/common';

interface CheckMathResult {
  status: 'verified_true' | 'verified_false' | 'cannot_verify';
  explanation: string;
  reasoning?: string;
  errorDetails?: {
    errorType: string;
    severity: string;
    conciseCorrection?: string;
    expectedValue?: string;
    actualValue?: string;
  };
}

export default function MathCheckerPage() {
  const [statement, setStatement] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<CheckMathResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Get schemas from generated schemas
  const { inputSchema, outputSchema } = toolSchemas[checkMathTool.config.id as keyof typeof toolSchemas];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await runToolWithAuth<{ statement: string }, CheckMathResult>('/api/tools/check-math', { statement });
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const exampleStatements = [
    'Revenue grew by 50% from $2 million to $3.5 million',
    '15% of $3.5 million equals $525,000',
    'The square root of 16 is 5',
    '2 + 2 = 4',
    'The derivative of x^2 is 3x'
  ];

  // Try tab content
  const tryContent = (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow-sm border">
        <div>
          <label htmlFor="statement" className="block text-sm font-medium text-gray-700 mb-1">
            Mathematical Statement <span className="text-red-500">*</span>
          </label>
          <input
            id="statement"
            type="text"
            value={statement}
            onChange={(e) => setStatement(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            placeholder="Enter a mathematical statement (e.g., '2 + 2 = 4')"
            required
          />
          <div className="mt-2 space-y-1">
            <p className="text-sm text-gray-600">Example statements:</p>
            <div className="flex flex-wrap gap-2">
              {exampleStatements.map((example, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setStatement(example)}
                  className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded border border-gray-300"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        </div>

        <SubmitButton
          isLoading={isLoading}
          disabled={!statement.trim()}
          text="Check Statement"
          loadingText="Checking Statement..."
          className="!bg-green-600 hover:!bg-green-700"
        />
      </form>

      <ErrorDisplay error={error} />

      {result && (
        <div className="mt-8 space-y-6">
          <div className={`p-6 rounded-lg border ${
            result.status === 'verified_true' 
              ? 'bg-green-50 border-green-200' 
              : result.status === 'verified_false'
              ? 'bg-red-50 border-red-200'
              : 'bg-yellow-50 border-yellow-200'
          }`}>
            <div className="mb-4">
              <h3 className="text-lg font-semibold">
                {result.status === 'verified_true' && '✓ Statement is Correct'}
                {result.status === 'verified_false' && '✗ Statement Contains Error'}
                {result.status === 'cannot_verify' && '? Cannot Verify Statement'}
              </h3>
            </div>
            
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-gray-700">Statement:</p>
                <p className="mt-1 font-mono text-sm bg-white bg-opacity-60 p-2 rounded">
                  "{statement}"
                </p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-700">Explanation:</p>
                <p className="mt-1 text-sm">{result.explanation}</p>
              </div>
              
              {result.reasoning && (
                <div>
                  <p className="text-sm font-medium text-gray-700">Reasoning:</p>
                  <p className="mt-1 text-sm">{result.reasoning}</p>
                </div>
              )}
              
              {result.errorDetails && (
                <div className="mt-4 p-3 bg-white bg-opacity-60 rounded">
                  <p className="text-sm font-medium text-gray-700 mb-2">Error Details:</p>
                  <div className="space-y-1 text-sm">
                    <p><span className="font-medium">Type:</span> {result.errorDetails.errorType}</p>
                    <p><span className="font-medium">Severity:</span> {result.errorDetails.severity}</p>
                    {result.errorDetails.conciseCorrection && (
                      <p><span className="font-medium">Correction:</span> {result.errorDetails.conciseCorrection}</p>
                    )}
                    {result.errorDetails.expectedValue && (
                      <p><span className="font-medium">Expected:</span> {result.errorDetails.expectedValue}</p>
                    )}
                    {result.errorDetails.actualValue && (
                      <p><span className="font-medium">Actual:</span> {result.errorDetails.actualValue}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // README content from generated file
  const readmeContent = getToolReadme(checkMathTool.config.id);

  // Docs tab content
  const docsContent = (
    <ToolDocumentation 
      toolId={checkMathTool.config.id}
      inputSchema={inputSchema}
      outputSchema={outputSchema}
      readmeContent={readmeContent}
    />
  );

  return (
    <TabbedToolPageLayout
      title={checkMathTool.config.name}
      description={checkMathTool.config.description}
      icon={<CalculatorIcon className="h-8 w-8 text-blue-600" />}
      tryContent={tryContent}
      docsContent={docsContent}
    />
  );
}