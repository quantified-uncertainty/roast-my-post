import React from 'react';
import { CalculatorIcon, CheckCircleIcon, XCircleIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/outline';
import type { CheckMathOutput, CheckMathWithMathJSOutput } from '@roast/ai';
import { getStatusColor } from '../../utils/resultFormatting';

// Union type for all math check outputs
type MathCheckResult = CheckMathOutput | CheckMathWithMathJSOutput | any;

interface MathCheckDisplayProps {
  result: MathCheckResult;
  statement: string;
  variant?: 'basic' | 'mathjs' | 'hybrid';
  className?: string;
}

export function MathCheckDisplay({ result, statement, variant = 'basic', className = '' }: MathCheckDisplayProps) {
  // Handle different result formats
  const getStatus = () => {
    // Basic check-math format
    if ('status' in result) {
      return result.status;
    }
    // check-math-with-mathjs format
    if ('result' in result) {
      return result.result.toLowerCase().replace(' ', '_');
    }
    // hybrid format
    if ('correct' in result) {
      return result.correct ? 'verified_true' : 'verified_false';
    }
    return 'cannot_verify';
  };

  const status = getStatus();
  const isCorrect = status === 'verified_true' || status === 'verified';
  const isIncorrect = status === 'verified_false';
  const isUnverifiable = status === 'cannot_verify';

  const statusConfig = {
    verified_true: {
      icon: CheckCircleIcon,
      title: '✓ Statement is Correct',
      bgClass: 'bg-green-50 border-green-200',
      iconColor: 'text-green-600'
    },
    verified_false: {
      icon: XCircleIcon,
      title: '✗ Statement Contains Error',
      bgClass: 'bg-red-50 border-red-200',
      iconColor: 'text-red-600'
    },
    cannot_verify: {
      icon: QuestionMarkCircleIcon,
      title: '? Cannot Verify Statement',
      bgClass: 'bg-yellow-50 border-yellow-200',
      iconColor: 'text-yellow-600'
    }
  };

  const config = statusConfig[isCorrect ? 'verified_true' : isIncorrect ? 'verified_false' : 'cannot_verify'];
  const Icon = config.icon;

  return (
    <div className={`space-y-6 ${className}`}>
      <div className={`p-6 rounded-lg border ${config.bgClass}`}>
        <div className="flex items-center mb-4">
          <Icon className={`h-6 w-6 mr-2 ${config.iconColor}`} />
          <h3 className="text-lg font-semibold">{config.title}</h3>
        </div>
        
        <div className="space-y-4">
          {/* Statement */}
          <div>
            <p className="text-sm font-medium text-gray-700">Statement:</p>
            <div className="mt-1 font-mono text-sm bg-white bg-opacity-60 p-3 rounded border border-gray-200">
              "{statement}"
            </div>
          </div>
          
          {/* Explanation */}
          {(result.explanation || result.reasoning) && (
            <div>
              <p className="text-sm font-medium text-gray-700">Explanation:</p>
              <p className="mt-1 text-sm text-gray-800">
                {result.explanation || result.reasoning}
              </p>
            </div>
          )}
          
          {/* Additional reasoning (for basic check-math) */}
          {result.reasoning && result.explanation && (
            <div>
              <p className="text-sm font-medium text-gray-700">Reasoning:</p>
              <p className="mt-1 text-sm text-gray-800">{result.reasoning}</p>
            </div>
          )}

          {/* Hybrid method info */}
          {variant === 'hybrid' && result.method && (
            <div>
              <p className="text-sm font-medium text-gray-700">Verification Method:</p>
              <p className="mt-1 text-sm text-gray-800">
                {result.method} {result.confidence && `(Confidence: ${Math.round(result.confidence * 100)}%)`}
              </p>
            </div>
          )}

          {/* MathJS specific results */}
          {variant === 'mathjs' && result.attemptedCalculation && (
            <div>
              <p className="text-sm font-medium text-gray-700">Attempted Calculation:</p>
              <code className="mt-1 block text-sm bg-gray-100 p-2 rounded">
                {result.attemptedCalculation}
              </code>
            </div>
          )}

          {/* Hybrid MathJS results */}
          {variant === 'hybrid' && result.mathJsResult && (
            <div className="p-3 bg-blue-50 rounded">
              <p className="text-sm font-medium text-blue-900 mb-2">MathJS Analysis:</p>
              {result.mathJsResult.computedValue !== undefined && (
                <p className="text-sm text-blue-800">
                  Computed Value: <code>{JSON.stringify(result.mathJsResult.computedValue)}</code>
                </p>
              )}
              {result.mathJsResult.error && (
                <p className="text-sm text-red-600">Error: {result.mathJsResult.error}</p>
              )}
            </div>
          )}

          {/* Hybrid LLM results */}
          {variant === 'hybrid' && result.llmResult && (
            <div className="p-3 bg-purple-50 rounded">
              <p className="text-sm font-medium text-purple-900 mb-2">LLM Analysis:</p>
              <p className="text-sm text-purple-800">{result.llmResult.assessment}</p>
              {result.llmResult.reasoning && (
                <p className="text-sm text-purple-700 mt-1">Reasoning: {result.llmResult.reasoning}</p>
              )}
            </div>
          )}
          
          {/* Error Details */}
          {result.errorDetails && (
            <div className="mt-4 p-4 bg-white bg-opacity-60 rounded border border-gray-200">
              <p className="text-sm font-medium text-gray-700 mb-3">Error Details:</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                {result.errorDetails.errorType && (
                  <div>
                    <span className="font-medium text-gray-600">Type:</span>
                    <span className="ml-2 text-gray-800">{result.errorDetails.errorType}</span>
                  </div>
                )}
                {result.errorDetails.severity && (
                  <div>
                    <span className="font-medium text-gray-600">Severity:</span>
                    <span className="ml-2 text-gray-800">{result.errorDetails.severity}</span>
                  </div>
                )}
                {result.errorDetails.conciseCorrection && (
                  <div className="md:col-span-2">
                    <span className="font-medium text-gray-600">Correction:</span>
                    <span className="ml-2 text-gray-800">{result.errorDetails.conciseCorrection}</span>
                  </div>
                )}
                {(result.errorDetails.expectedValue || result.expectedValue) && (
                  <div>
                    <span className="font-medium text-gray-600">Expected:</span>
                    <code className="ml-2 text-gray-800 bg-gray-100 px-1 py-0.5 rounded">
                      {result.errorDetails.expectedValue || result.expectedValue}
                    </code>
                  </div>
                )}
                {(result.errorDetails.actualValue || result.actualValue) && (
                  <div>
                    <span className="font-medium text-gray-600">Actual:</span>
                    <code className="ml-2 text-gray-800 bg-gray-100 px-1 py-0.5 rounded">
                      {result.errorDetails.actualValue || result.actualValue}
                    </code>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Calculation details (for mathjs) */}
          {result.calculation && (
            <div className="p-3 bg-gray-50 rounded">
              <p className="text-sm font-medium text-gray-700">Calculation Steps:</p>
              <pre className="mt-1 text-sm text-gray-800 whitespace-pre-wrap">{result.calculation}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}