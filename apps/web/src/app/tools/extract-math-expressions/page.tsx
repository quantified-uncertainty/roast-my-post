'use client';

import { useState } from 'react';
import { CalculatorIcon } from '@heroicons/react/24/outline';
import { extractMathExpressionsTool, toolSchemas } from '@roast/ai';
import { ToolPageLayout } from '../components/ToolPageLayout';
import { ApiDocumentation } from '../components/ApiDocumentation';
import { runToolWithAuth } from '@/app/tools/utils/runToolWithAuth';

const checkToolPath = extractMathExpressionsTool.config.path;

export default function ExtractMathExpressionsPage() {
  const [text, setText] = useState('');
  const [result, setResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Get schemas from centralized registry
  const { inputSchema, outputSchema } = toolSchemas[extractMathExpressionsTool.config.id as keyof typeof toolSchemas];

  const handleExtract = async () => {
    if (!text.trim()) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await runToolWithAuth(checkToolPath, { 
        text,
        verifyCalculations: true 
      });
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ToolPageLayout
      title={extractMathExpressionsTool.config.name}
      description={extractMathExpressionsTool.config.description}
      icon={<CalculatorIcon className="h-8 w-8 text-green-600" />}
    >
      <div className="space-y-6">
        <div>
          <label htmlFor="text" className="block text-sm font-medium text-gray-700 mb-2">
            Enter text with math expressions
          </label>
          <textarea
            id="text"
            rows={10}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            placeholder="Enter text containing mathematical expressions..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </div>

        <button
          onClick={handleExtract}
          disabled={isLoading || !text.trim()}
          className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Extracting...' : 'Extract Math'}
        </button>

        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {result && result.expressions && (
          <div className="space-y-4">
            <h2 className="text-lg font-medium text-gray-900">
              {result.expressions.length} Expressions Found
            </h2>
            {result.expressions.map((expr: any, index: number) => (
              <div key={index} className={`rounded-lg p-4 ${expr.hasError ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
                <p className="text-sm font-mono mb-2">{expr.originalText}</p>
                {expr.normalizedExpression && expr.normalizedExpression !== expr.originalText && (
                  <p className="text-xs text-gray-600 mb-2">
                    Normalized: <code>{expr.normalizedExpression}</code>
                  </p>
                )}
                {expr.hasError && expr.error && (
                  <p className="text-sm text-red-600">{expr.error}</p>
                )}
                {expr.calculatedResult !== undefined && (
                  <p className="text-sm text-gray-700">Result: {expr.calculatedResult}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      
      <ApiDocumentation 
        title="API Documentation"
        endpoint={`/api/tools/${extractMathExpressionsTool.config.id}`}
        method="POST"
        inputSchema={inputSchema}
        outputSchema={outputSchema}
      />
    </ToolPageLayout>
  );
}
