'use client';

import { useState } from 'react';
import { checkMathWithMathJsTool } from '@roast/ai';
import { CheckIcon, XMarkIcon, QuestionMarkCircleIcon, CalculatorIcon } from '@heroicons/react/24/outline';
import { runToolWithAuth } from '@/app/tools/utils/runToolWithAuth';

const checkToolPath = checkMathWithMathJsTool.config.path;

const statusConfig = {
  verified_true: {
    icon: CheckIcon,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    label: 'Verified True'
  },
  verified_false: {
    icon: XMarkIcon,
    color: 'text-red-600', 
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    label: 'Verified False'
  },
  cannot_verify: {
    icon: QuestionMarkCircleIcon,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    label: 'Cannot Verify'
  }
};

export default function CheckMathWithMathJsPage() {
  const [statement, setStatement] = useState('');
  const [context, setContext] = useState('');
  const [result, setResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get examples from the tool configuration
  const exampleStatements = (checkMathWithMathJsTool.config as any).examples || [
    '2 + 2 = 4',
    'sqrt(144) = 12',
    '10% of 50 is 5',
    '5 km + 3000 m = 8 km',
  ];

  const handleCheck = async () => {
    if (!statement.trim()) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await runToolWithAuth('/api/tools/check-math-with-mathjs', { 
        statement,
        ...(context.trim() && { context }) 
      });
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <CalculatorIcon className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Math Verification Agent</h1>
        </div>
        <p className="text-gray-600 mb-4">
          Verify mathematical statements using Claude with MathJS tools. This agentic approach uses
          Claude to intelligently choose and use appropriate MathJS functions for numerical computation.
        </p>
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            <strong>Note:</strong> This tool uses numerical computation (MathJS), not symbolic math.
            It cannot verify symbolic equations, theorems, or perform algebraic manipulations.
            For best results, use concrete numerical statements.
          </p>
        </div>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); handleCheck(); }} className="space-y-6 mb-8">
        <div>
          <label htmlFor="statement" className="block text-sm font-medium text-gray-700 mb-2">
            Mathematical Statement
          </label>
          <textarea
            id="statement"
            value={statement}
            onChange={(e) => setStatement(e.target.value)}
            placeholder="Enter a mathematical statement to verify..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={3}
            required
          />
        </div>

        <div>
          <label htmlFor="context" className="block text-sm font-medium text-gray-700 mb-2">
            Additional Context (Optional)
          </label>
          <textarea
            id="context"
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="Provide any additional context if needed..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={2}
          />
        </div>

        <button
          type="submit"
          disabled={isLoading || !statement.trim()}
          className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Verifying...' : 'Verify Statement'}
        </button>
      </form>

      {/* Example Statements */}
      <div className="mb-8">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Try these examples:</h3>
        <div className="flex flex-wrap gap-2">
          {exampleStatements.map((example: string, index: number) => (
            <button
              key={index}
              onClick={() => {
                setStatement(example);
                setContext('');
              }}
              className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
            >
              {example}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {result && (
        <div className="space-y-6">
          <div className={`rounded-lg border p-6 ${statusConfig[result.status as keyof typeof statusConfig]?.bgColor} ${statusConfig[result.status as keyof typeof statusConfig]?.borderColor}`}>
              <div className="flex items-start space-x-3">
                {(() => {
                  const config = statusConfig[result.status as keyof typeof statusConfig];
                  const Icon = config?.icon || QuestionMarkCircleIcon;
                  return <Icon className={`h-5 w-5 mt-0.5 ${config?.color}`} />;
                })()}
                <div className="flex-1">
                  <h3 className={`text-lg font-medium ${statusConfig[result.status as keyof typeof statusConfig]?.color}`}>
                    {statusConfig[result.status as keyof typeof statusConfig]?.label || result.status}
                  </h3>
                  <p className="mt-2 text-sm text-gray-700">{result.explanation}</p>
                  
                  {result.verificationDetails && (
                    <div className="mt-4 space-y-2">
                      {result.verificationDetails.simplifiedExpression && (
                        <p className="text-sm">
                          <span className="font-medium">Simplified:</span> <code className="bg-white px-2 py-1 rounded">{result.verificationDetails.simplifiedExpression}</code>
                        </p>
                      )}
                      {result.verificationDetails.calculatedResult !== undefined && (
                        <p className="text-sm">
                          <span className="font-medium">Calculated:</span> <code className="bg-white px-2 py-1 rounded">{result.verificationDetails.calculatedResult}</code>
                        </p>
                      )}
                      {result.verificationDetails.expectedResult !== undefined && (
                        <p className="text-sm">
                          <span className="font-medium">Expected:</span> <code className="bg-white px-2 py-1 rounded">{result.verificationDetails.expectedResult}</code>
                        </p>
                      )}
                    </div>
                  )}
                  
                  {result.errorDetails && (
                    <div className="mt-4 bg-red-100 rounded p-3">
                      <p className="text-sm font-medium text-red-800">{result.errorDetails.type}</p>
                      <p className="text-sm text-red-700 mt-1">{result.errorDetails.description}</p>
                      {result.errorDetails.suggestion && (
                        <p className="text-sm text-red-600 mt-2">
                          <span className="font-medium">Suggestion:</span> {result.errorDetails.suggestion}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}