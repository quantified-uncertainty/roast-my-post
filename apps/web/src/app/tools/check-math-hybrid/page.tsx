'use client';

import { useState } from 'react';
import { CalculatorIcon } from '@heroicons/react/24/outline';
import { checkMathHybridTool, toolSchemas, getToolReadme } from '@roast/ai';
import { runToolWithAuth } from '@/app/tools/utils/runToolWithAuth';
import { TabbedToolPageLayout } from '../components/TabbedToolPageLayout';
import { ToolDocumentation } from '../components/ToolDocumentation';

interface MathResult {
  correct: boolean;
  reasoning: string;
  confidence: number;
  method: string;
  mathJsResult?: {
    computedValue?: any;
    error?: string;
  };
  llmResult?: {
    assessment: string;
    reasoning: string;
  };
}

export default function CheckMathHybridPage() {
  const [statement, setStatement] = useState('');
  const [result, setResult] = useState<MathResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Get schemas from centralized registry
  const { inputSchema, outputSchema } = toolSchemas[checkMathHybridTool.config.id as keyof typeof toolSchemas];

  const handleCheck = async () => {
    if (!statement.trim()) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await runToolWithAuth<{ statement: string }, MathResult>('/api/tools/check-math-hybrid', { statement });
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const exampleStatements = [
    '2 + 2 = 4',
    'Revenue grew by 50% from $10M to $15M',
    'sqrt(16) = 4',
    'The population will double in 10 years with 7% annual growth',
    'If x = 5, then x^2 = 25',
    'sin(π/2) = 1'
  ];

  // Try tab content
  const tryContent = (
    <div className="space-y-6">
      <form onSubmit={(e) => { e.preventDefault(); handleCheck(); }} className="space-y-6 bg-white p-6 rounded-lg shadow-sm border">
        <div>
          <label htmlFor="statement" className="block text-sm font-medium text-gray-700 mb-1">
            Mathematical Statement <span className="text-red-500">*</span>
          </label>
          <textarea
            id="statement"
            value={statement}
            onChange={(e) => setStatement(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            rows={3}
            placeholder="Enter a mathematical statement to verify..."
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
                className="text-left px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded border text-gray-700 transition-colors"
              >
                {example}
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading || !statement.trim()}
          className="w-full bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Checking...' : 'Check Statement'}
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
            <h2 className="text-lg font-medium text-gray-900 mb-4">Result</h2>
            
            <div className={`p-4 rounded-lg border ${
              result.correct ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <p className={`font-semibold text-lg ${
                  result.correct ? 'text-green-800' : 'text-red-800'
                }`}>
                  {result.correct ? '✓ Correct' : '✗ Incorrect'}
                </p>
                <span className="text-sm text-gray-600">
                  Confidence: {Math.round(result.confidence * 100)}%
                </span>
              </div>
              
              <div className="space-y-3 text-sm">
                <div>
                  <p className="font-medium text-gray-700">Method Used:</p>
                  <p className="text-gray-600">{result.method}</p>
                </div>
                
                <div>
                  <p className="font-medium text-gray-700">Reasoning:</p>
                  <p className="text-gray-600">{result.reasoning}</p>
                </div>
                
                {result.mathJsResult && (
                  <div className="mt-3 p-3 bg-blue-50 rounded">
                    <p className="font-medium text-blue-900 mb-1">MathJS Computation:</p>
                    {result.mathJsResult.computedValue !== undefined ? (
                      <p className="text-blue-700">
                        Result: <code className="bg-white px-2 py-1 rounded">
                          {JSON.stringify(result.mathJsResult.computedValue)}
                        </code>
                      </p>
                    ) : result.mathJsResult.error ? (
                      <p className="text-red-600">Error: {result.mathJsResult.error}</p>
                    ) : null}
                  </div>
                )}
                
                {result.llmResult && (
                  <div className="mt-3 p-3 bg-purple-50 rounded">
                    <p className="font-medium text-purple-900 mb-1">LLM Analysis:</p>
                    <p className="text-purple-700 mb-1">{result.llmResult.assessment}</p>
                    <p className="text-purple-600 text-xs">{result.llmResult.reasoning}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // README content from generated file
  const readmeContent = getToolReadme(checkMathHybridTool.config.id);

  // Docs tab content
  const docsContent = (
    <ToolDocumentation 
      toolId={checkMathHybridTool.config.id}
      inputSchema={inputSchema}
      outputSchema={outputSchema}
      readmeContent={readmeContent}
    />
  );

  return (
    <TabbedToolPageLayout
      title={checkMathHybridTool.config.name}
      description={checkMathHybridTool.config.description}
      icon={<CalculatorIcon className="h-8 w-8 text-purple-600" />}
      tryContent={tryContent}
      docsContent={docsContent}
    />
  );
}