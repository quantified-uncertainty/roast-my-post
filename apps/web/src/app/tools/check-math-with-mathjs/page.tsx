'use client';

import { useState } from 'react';
import { CalculatorIcon } from '@heroicons/react/24/outline';
import { checkMathWithMathJsTool, toolSchemas, getToolReadme } from '@roast/ai';
import { runToolWithAuth } from '@/app/tools/utils/runToolWithAuth';
import { TabbedToolPageLayout } from '../components/TabbedToolPageLayout';
import { ToolDocumentation } from '../components/ToolDocumentation';

interface CheckMathResult {
  statement: string;
  result: 'Verified True' | 'Verified False' | 'Cannot Verify';
  explanation: string;
  attemptedCalculation?: string;
  error?: string;
  expectedValue?: string;
  actualValue?: string;
  calculation?: string;
}

export default function CheckMathWithMathJSPage() {
  const [statement, setStatement] = useState('');
  const [result, setResult] = useState<CheckMathResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Get schemas from centralized registry
  const { inputSchema, outputSchema } = toolSchemas[checkMathWithMathJsTool.config.id as keyof typeof toolSchemas];

  const handleSubmit = async () => {
    if (!statement.trim()) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await runToolWithAuth<{ statement: string }, CheckMathResult>('/api/tools/check-math-with-mathjs', { statement });
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const exampleStatements = [
    '2 + 2 = 4',
    'sqrt(144) = 12',
    '5 km + 3000 m = 8 km',
    '10% of 50 is 5',
    'sin(90 degrees) = 1',
    'The derivative of x^2 is 2x',
    '3 * (4 + 5) = 27',
    '1 mile = 1.6 kilometers'
  ];

  const getResultColor = (result: string) => {
    switch (result) {
      case 'Verified True':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'Verified False':
        return 'bg-red-50 border-red-200 text-red-800';
      default:
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
    }
  };

  // Try tab content
  const tryContent = (
    <div className="space-y-6">
      <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-6 bg-white p-6 rounded-lg shadow-sm border">
        <div>
          <label htmlFor="statement" className="block text-sm font-medium text-gray-700 mb-1">
            Mathematical Statement <span className="text-red-500">*</span>
          </label>
          <textarea
            id="statement"
            value={statement}
            onChange={(e) => setStatement(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            rows={3}
            placeholder="Enter a mathematical statement to verify (e.g., '2 + 2 = 4' or 'The square root of 144 is 12')"
            required
          />
        </div>

        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Example statements:</p>
          <div className="grid grid-cols-1 gap-2">
            {exampleStatements.map((example, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setStatement(example)}
                className="text-left px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded border text-gray-700 transition-colors font-mono"
              >
                {example}
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading || !statement.trim()}
          className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Verifying...' : 'Verify Statement'}
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
            <h2 className="text-lg font-medium text-gray-900 mb-4">Verification Result</h2>
            <div className={`p-4 rounded-lg border ${getResultColor(result.result)}`}>
              <p className="font-semibold text-lg mb-2">{result.result}</p>
              <p className="text-sm mb-3">
                The statement "{result.statement}" is {
                  result.result === 'Verified True' ? 'mathematically correct' :
                  result.result === 'Verified False' ? 'incorrect' :
                  'unable to be verified with certainty'
                }.
              </p>
              <div className="text-sm space-y-2">
                <p><strong>Explanation:</strong> {result.explanation}</p>
                {result.calculation && (
                  <p><strong>Calculation:</strong> <code className="bg-gray-100 px-2 py-1 rounded">{result.calculation}</code></p>
                )}
                {result.expectedValue && (
                  <p><strong>Expected:</strong> {result.expectedValue}</p>
                )}
                {result.actualValue && (
                  <p><strong>Actual:</strong> {result.actualValue}</p>
                )}
                {result.error && (
                  <p className="text-red-600"><strong>Error:</strong> {result.error}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // README content from generated file
  const readmeContent = getToolReadme(checkMathWithMathJsTool.config.id);

  // Docs tab content
  const docsContent = (
    <ToolDocumentation 
      toolId={checkMathWithMathJsTool.config.id}
      inputSchema={inputSchema}
      outputSchema={outputSchema}
      readmeContent={readmeContent}
    />
  );

  return (
    <TabbedToolPageLayout
      title={checkMathWithMathJsTool.config.name}
      description={checkMathWithMathJsTool.config.description}
      icon={<CalculatorIcon className="h-8 w-8 text-indigo-600" />}
      tryContent={tryContent}
      docsContent={docsContent}
    />
  );
}