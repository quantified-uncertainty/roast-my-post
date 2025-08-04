'use client';

import { useState } from 'react';
import { toolConfigs } from '@roast/ai';
import { CheckIcon, XMarkIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/solid';
import { runToolWithAuth } from '@/app/tools/utils/runToolWithAuth';

const checkToolPath = toolConfigs.checkMathWithMathJs.path;

const statusConfig = {
  verified_true: {
    icon: CheckIcon,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    label: 'Verified Correct'
  },
  verified_false: {
    icon: XMarkIcon,
    color: 'text-red-600', 
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    label: 'Incorrect'
  },
  cannot_verify: {
    icon: QuestionMarkCircleIcon,
    color: 'text-gray-500',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    label: 'Cannot Verify'
  }
};

export default function CheckMathWithMathJsPage() {
  const [statement, setStatement] = useState('');
  const [context, setContext] = useState('');
  const [result, setResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheck = async () => {
    if (!statement.trim()) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await runToolWithAuth(checkToolPath, { 
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
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Check Math with MathJS</h1>
        <p className="text-gray-600">
          Verify mathematical statements using the MathJS library and AI reasoning.
        </p>
      </div>

      <div className="space-y-6">
        <div>
          <label htmlFor="statement" className="block text-sm font-medium text-gray-700 mb-2">
            Mathematical Statement
          </label>
          <textarea
            id="statement"
            rows={3}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            placeholder="Enter a mathematical statement to verify (e.g., '2 + 2 = 4', 'The square root of 16 is 4')"
            value={statement}
            onChange={(e) => setStatement(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="context" className="block text-sm font-medium text-gray-700 mb-2">
            Context (Optional)
          </label>
          <textarea
            id="context"
            rows={2}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            placeholder="Provide any additional context if needed..."
            value={context}
            onChange={(e) => setContext(e.target.value)}
          />
        </div>

        <button
          onClick={handleCheck}
          disabled={isLoading || !statement.trim()}
          className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Checking...' : 'Check Statement'}
        </button>

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
    </div>
  );
}