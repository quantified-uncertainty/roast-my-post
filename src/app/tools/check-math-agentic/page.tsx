'use client';

import { useState } from 'react';
import { CheckMathAgenticInput, CheckMathAgenticOutput } from '@/tools/check-math-agentic/types';
import { CalculatorIcon, CheckCircleIcon, XCircleIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/outline';

const statusConfig = {
  verified_true: {
    icon: CheckCircleIcon,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    label: 'Verified True',
  },
  verified_false: {
    icon: XCircleIcon,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    label: 'Verified False',
  },
  cannot_verify: {
    icon: QuestionMarkCircleIcon,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    label: 'Cannot Verify',
  },
};

export default function CheckMathAgenticPage() {
  const [input, setInput] = useState('');
  const [context, setContext] = useState('');
  const [result, setResult] = useState<CheckMathAgenticOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const payload: CheckMathAgenticInput = {
        statement: input.trim(),
        ...(context.trim() && { context: context.trim() }),
      };

      const response = await fetch('/api/tools/check-math-agentic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to verify statement');
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const exampleStatements = [
    '2 + 2 = 4',
    'The binomial coefficient "10 choose 3" equals 120',
    'Converting 100 fahrenheit to celsius gives 37.78 degrees',
    '10% of 50 is 10',
    'sqrt(144) = 12',
    'log(1000, 10) = 3',
    'The derivative of x³ is 3x²',
    '5 km + 3000 m = 8 km',
  ];

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <CalculatorIcon className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Math Verification Agent</h1>
        </div>
        <p className="text-gray-600 mb-2">
          Verify mathematical statements using Claude with MathJS tools. This agentic approach uses
          Claude to intelligently choose and use appropriate MathJS functions.
        </p>
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            <strong>Note:</strong> This tool uses numerical computation (MathJS), not symbolic math.
            It cannot verify symbolic equations, theorems, or perform algebraic manipulations.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 mb-8">
        <div>
          <label htmlFor="statement" className="block text-sm font-medium text-gray-700 mb-2">
            Mathematical Statement
          </label>
          <textarea
            id="statement"
            value={input}
            onChange={(e) => setInput(e.target.value)}
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
          disabled={loading || !input.trim()}
          className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Verifying...' : 'Verify Statement'}
        </button>
      </form>

      {/* Example Statements */}
      <div className="mb-8">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Try these examples:</h3>
        <div className="flex flex-wrap gap-2">
          {exampleStatements.map((statement, index) => (
            <button
              key={index}
              onClick={() => {
                setInput(statement);
                setContext('');
              }}
              className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
            >
              {statement}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-6">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {result && (
        <div className="space-y-6">
          {/* Status Card */}
          <div className={`p-6 rounded-lg border-2 ${statusConfig[result.status].bgColor} ${statusConfig[result.status].borderColor}`}>
            <div className="flex items-start gap-4">
              {(() => {
                const StatusIcon = statusConfig[result.status].icon;
                return <StatusIcon className={`h-8 w-8 ${statusConfig[result.status].color} flex-shrink-0`} />;
              })()}
              <div className="flex-1">
                <h2 className={`text-xl font-semibold mb-2 ${statusConfig[result.status].color}`}>
                  {statusConfig[result.status].label}
                </h2>
                <p className="text-gray-800">{result.explanation}</p>
              </div>
            </div>
          </div>

          {/* Verification Details */}
          {result.verificationDetails && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">Verification Details</h3>
              {result.verificationDetails.mathJsExpression && (
                <div className="mb-2">
                  <span className="text-sm text-blue-700">Expression:</span>
                  <code className="ml-2 px-2 py-1 bg-blue-100 rounded text-sm">
                    {result.verificationDetails.mathJsExpression}
                  </code>
                </div>
              )}
              {result.verificationDetails.computedValue && (
                <div>
                  <span className="text-sm text-blue-700">Result:</span>
                  <code className="ml-2 px-2 py-1 bg-blue-100 rounded text-sm">
                    {result.verificationDetails.computedValue}
                  </code>
                </div>
              )}
            </div>
          )}

          {/* Error Details */}
          {result.errorDetails && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <h3 className="font-semibold text-red-900 mb-2">Error Details</h3>
              <div className="space-y-1 text-sm">
                <div>
                  <span className="text-red-700">Type:</span> 
                  <span className="ml-2 font-medium">{result.errorDetails.errorType}</span>
                </div>
                <div>
                  <span className="text-red-700">Severity:</span> 
                  <span className="ml-2 font-medium">{result.errorDetails.severity}</span>
                </div>
                {result.errorDetails.conciseCorrection && (
                  <div>
                    <span className="text-red-700">Correction:</span> 
                    <code className="ml-2 px-2 py-1 bg-red-100 rounded">
                      {result.errorDetails.conciseCorrection}
                    </code>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Agent Reasoning */}
          {result.agentReasoning && (
            <details className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <summary className="font-semibold text-gray-900 cursor-pointer">
                Agent Reasoning Process
              </summary>
              <div className="mt-4 space-y-2">
                {result.agentReasoning.split('\n').map((line, index) => (
                  <p key={index} className="text-sm text-gray-700">{line}</p>
                ))}
              </div>
            </details>
          )}

          {/* Tool Calls */}
          {result.toolCalls && result.toolCalls.length > 0 && (
            <details className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <summary className="font-semibold text-gray-900 cursor-pointer">
                Tool Calls ({result.toolCalls.length})
              </summary>
              <div className="mt-4 space-y-4">
                {result.toolCalls.map((call, index) => (
                  <div key={index} className="p-3 bg-white rounded border border-gray-200">
                    <h4 className="font-medium text-gray-900 mb-2">
                      {index + 1}. {call.tool}
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-gray-600">Input:</span>
                        <pre className="mt-1 p-2 bg-gray-100 rounded overflow-x-auto">
                          {JSON.stringify(call.input, null, 2)}
                        </pre>
                      </div>
                      <div>
                        <span className="text-gray-600">Output:</span>
                        <pre className="mt-1 p-2 bg-gray-100 rounded overflow-x-auto">
                          {JSON.stringify(call.output, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </details>
          )}

          {/* LLM Token Usage */}
          {result.llmInteraction && (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">Token Usage</h3>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Prompt:</span>
                  <span className="ml-2 font-medium">{result.llmInteraction.tokensUsed.prompt}</span>
                </div>
                <div>
                  <span className="text-gray-600">Completion:</span>
                  <span className="ml-2 font-medium">{result.llmInteraction.tokensUsed.completion}</span>
                </div>
                <div>
                  <span className="text-gray-600">Total:</span>
                  <span className="ml-2 font-medium">{result.llmInteraction.tokensUsed.total}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}