'use client';

import { useState } from 'react';
import { checkMathWithMathJsTool } from '@roast/ai';
import { CheckIcon, XMarkIcon, QuestionMarkCircleIcon, CalculatorIcon, CodeBracketIcon, ChatBubbleLeftRightIcon, ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
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
  const [showInputSchema, setShowInputSchema] = useState(false);
  const [showOutputSchema, setShowOutputSchema] = useState(false);
  const [showAgentMessages, setShowAgentMessages] = useState(false);
  const [lastInput, setLastInput] = useState<any>(null);

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

    const input = { 
      statement,
      ...(context.trim() && { context }) 
    };
    setLastInput(input);

    try {
      const response = await runToolWithAuth('/api/tools/check-math-with-mathjs', input);
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Get input and output schemas from the tool
  const inputSchema = {
    type: 'object',
    properties: {
      statement: {
        type: 'string',
        description: 'The mathematical statement to verify',
        maxLength: 5000
      },
      context: {
        type: 'string',
        description: 'Additional context about the statement (optional)',
        maxLength: 1000
      }
    },
    required: ['statement']
  };

  const outputSchema = {
    type: 'object',
    properties: {
      statement: { type: 'string', description: 'The original statement' },
      status: { 
        type: 'string',
        enum: ['verified_true', 'verified_false', 'cannot_verify'],
        description: 'Verification status'
      },
      explanation: { type: 'string', description: 'Clear explanation of the verification' },
      verificationDetails: {
        type: 'object',
        properties: {
          mathJsExpression: { type: 'string' },
          computedValue: { type: 'string' },
          steps: { type: 'array', items: { type: 'object' } }
        }
      },
      errorDetails: {
        type: 'object',
        properties: {
          errorType: { type: 'string', enum: ['calculation', 'logic', 'unit', 'notation', 'conceptual'] },
          severity: { type: 'string', enum: ['critical', 'major', 'minor'] },
          conciseCorrection: { type: 'string' },
          expectedValue: { type: 'string' },
          actualValue: { type: 'string' }
        }
      },
      llmInteraction: {
        type: 'object',
        properties: {
          model: { type: 'string' },
          prompt: { type: 'string' },
          response: { type: 'string' },
          tokensUsed: { type: 'object' },
          timestamp: { type: 'string', format: 'date-time' },
          duration: { type: 'number' }
        }
      }
    },
    required: ['statement', 'status', 'explanation']
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
          {/* Main Result */}
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
                    {result.verificationDetails.mathJsExpression && (
                      <p className="text-sm">
                        <span className="font-medium">MathJS Expression:</span> <code className="bg-white px-2 py-1 rounded">{result.verificationDetails.mathJsExpression}</code>
                      </p>
                    )}
                    {result.verificationDetails.computedValue && (
                      <p className="text-sm">
                        <span className="font-medium">Computed Value:</span> <code className="bg-white px-2 py-1 rounded">{result.verificationDetails.computedValue}</code>
                      </p>
                    )}
                  </div>
                )}
                
                {result.errorDetails && (
                  <div className="mt-4 bg-red-100 rounded p-3">
                    <p className="text-sm font-medium text-red-800">Error Type: {result.errorDetails.errorType}</p>
                    <p className="text-sm text-red-700 mt-1">Severity: {result.errorDetails.severity}</p>
                    {result.errorDetails.conciseCorrection && (
                      <p className="text-sm text-red-600 mt-2">
                        <span className="font-medium">Correction:</span> {result.errorDetails.conciseCorrection}
                      </p>
                    )}
                    {result.errorDetails.expectedValue && (
                      <p className="text-sm text-red-600 mt-1">
                        <span className="font-medium">Expected:</span> {result.errorDetails.expectedValue}
                      </p>
                    )}
                    {result.errorDetails.actualValue && (
                      <p className="text-sm text-red-600 mt-1">
                        <span className="font-medium">Actual:</span> {result.errorDetails.actualValue}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Agent Messages Section */}
          {result.llmInteraction && (
            <div className="bg-white shadow rounded-lg">
              <button
                onClick={() => setShowAgentMessages(!showAgentMessages)}
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <ChatBubbleLeftRightIcon className="h-5 w-5 text-gray-600" />
                  <h3 className="text-lg font-medium text-gray-900">Agent Messages</h3>
                  <span className="text-sm text-gray-500">
                    ({result.llmInteraction.tokensUsed?.total || 0} tokens, {result.llmInteraction.duration || 0}ms)
                  </span>
                </div>
                {showAgentMessages ? (
                  <ChevronDownIcon className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronRightIcon className="h-5 w-5 text-gray-400" />
                )}
              </button>
              {showAgentMessages && (
                <div className="px-6 pb-6 space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Response:</h4>
                    <pre className="text-xs bg-gray-50 p-3 rounded overflow-x-auto whitespace-pre-wrap">
                      {result.llmInteraction.response}
                    </pre>
                  </div>
                  <div className="text-xs text-gray-500">
                    Model: {result.llmInteraction.model}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* API Documentation Section */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b">
              <div className="flex items-center gap-2">
                <CodeBracketIcon className="h-5 w-5 text-gray-600" />
                <h3 className="text-lg font-medium text-gray-900">API Documentation</h3>
              </div>
            </div>
            
            {/* Input Schema */}
            <div className="border-b">
              <button
                onClick={() => setShowInputSchema(!showInputSchema)}
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
              >
                <span className="font-medium text-gray-700">Input Schema</span>
                {showInputSchema ? (
                  <ChevronDownIcon className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronRightIcon className="h-5 w-5 text-gray-400" />
                )}
              </button>
              {showInputSchema && (
                <div className="px-6 pb-4">
                  <pre className="text-xs bg-gray-50 p-3 rounded overflow-x-auto">
                    {JSON.stringify(inputSchema, null, 2)}
                  </pre>
                  {lastInput && (
                    <div className="mt-4">
                      <h5 className="text-sm font-medium text-gray-700 mb-2">Last Input:</h5>
                      <pre className="text-xs bg-blue-50 p-3 rounded overflow-x-auto">
                        {JSON.stringify(lastInput, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Output Schema */}
            <div>
              <button
                onClick={() => setShowOutputSchema(!showOutputSchema)}
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
              >
                <span className="font-medium text-gray-700">Output Schema</span>
                {showOutputSchema ? (
                  <ChevronDownIcon className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronRightIcon className="h-5 w-5 text-gray-400" />
                )}
              </button>
              {showOutputSchema && (
                <div className="px-6 pb-4">
                  <pre className="text-xs bg-gray-50 p-3 rounded overflow-x-auto">
                    {JSON.stringify(outputSchema, null, 2)}
                  </pre>
                  {result && (
                    <div className="mt-4">
                      <h5 className="text-sm font-medium text-gray-700 mb-2">Current Output:</h5>
                      <pre className="text-xs bg-green-50 p-3 rounded overflow-x-auto">
                        {JSON.stringify(result, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}