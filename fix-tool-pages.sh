#!/bin/bash

echo "Fixing tool page imports..."

# Fix check-math-with-mathjs page
cat > apps/web/src/app/tools/check-math-with-mathjs/page.tsx << 'EOF'
'use client';

import { useState } from 'react';
import { checkMathWithMathJsTool } from '@roast/ai';
import { CheckIcon, XMarkIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/solid';
import { runToolWithAuth } from '@/app/tools/utils/runToolWithAuth';

const checkToolPath = checkMathWithMathJsTool.config.path;

interface MathExpression {
  id: string;
  originalText: string;
  normalizedExpression: string;
  verificationStatus: 'verified_true' | 'verified_false' | 'cannot_verify';
  errorType?: string;
  mathJsResult?: string;
  expectedResult?: string;
  metadata: {
    startLine: number;
    endLine: number;
    confidence: number;
  };
}

interface ToolResult {
  expressions: MathExpression[];
  summary: {
    totalExpressions: number;
    verifiedTrue: number;
    verifiedFalse: number;
    cannotVerify: number;
  };
}

const statusConfig = {
  verified_true: {
    icon: CheckIcon,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    label: 'Verified'
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
  const [text, setText] = useState('');
  const [result, setResult] = useState<ToolResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheck = async () => {
    if (!text.trim()) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await runToolWithAuth(checkToolPath, { text });
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
          Verify mathematical expressions and calculations using the MathJS library for precise evaluation.
        </p>
      </div>

      <div className="space-y-6">
        <div>
          <label htmlFor="text" className="block text-sm font-medium text-gray-700 mb-2">
            Enter text with mathematical expressions
          </label>
          <textarea
            id="text"
            rows={8}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            placeholder="Enter text containing mathematical expressions..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </div>

        <button
          onClick={handleCheck}
          disabled={isLoading || !text.trim()}
          className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Checking...' : 'Check Math'}
        </button>

        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {result && (
          <div className="space-y-6">
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Summary</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Total</p>
                  <p className="text-2xl font-semibold text-gray-900">{result.summary.totalExpressions}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Verified</p>
                  <p className="text-2xl font-semibold text-green-600">{result.summary.verifiedTrue}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Incorrect</p>
                  <p className="text-2xl font-semibold text-red-600">{result.summary.verifiedFalse}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Cannot Verify</p>
                  <p className="text-2xl font-semibold text-gray-500">{result.summary.cannotVerify}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-lg font-medium text-gray-900">Expressions Found</h2>
              {result.expressions.map((expr) => {
                const status = statusConfig[expr.verificationStatus];
                const Icon = status.icon;
                
                return (
                  <div
                    key={expr.id}
                    className={`rounded-lg border p-4 ${status.bgColor} ${status.borderColor}`}
                  >
                    <div className="flex items-start space-x-3">
                      <Icon className={`h-5 w-5 mt-0.5 ${status.color}`} />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-sm font-medium ${status.color}`}>
                            {status.label}
                          </span>
                          <span className="text-xs text-gray-500">
                            Lines {expr.metadata.startLine}-{expr.metadata.endLine}
                          </span>
                        </div>
                        <p className="text-sm text-gray-900 font-mono bg-white rounded p-2 mb-2">
                          {expr.originalText}
                        </p>
                        {expr.normalizedExpression !== expr.originalText && (
                          <p className="text-xs text-gray-600 mb-2">
                            Normalized: <code className="bg-white rounded px-1">{expr.normalizedExpression}</code>
                          </p>
                        )}
                        <div className="flex flex-wrap gap-2 text-xs">
                          {expr.mathJsResult && (
                            <span className="bg-white rounded px-2 py-1">
                              Result: <strong>{expr.mathJsResult}</strong>
                            </span>
                          )}
                          {expr.expectedResult && (
                            <span className="bg-white rounded px-2 py-1">
                              Expected: <strong>{expr.expectedResult}</strong>
                            </span>
                          )}
                          {expr.errorType && (
                            <span className="bg-red-100 text-red-700 rounded px-2 py-1">
                              {expr.errorType}
                            </span>
                          )}
                          <span className="bg-gray-100 text-gray-600 rounded px-2 py-1">
                            Confidence: {Math.round(expr.metadata.confidence * 100)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
EOF

# Fix check-math-with-mathjs actions
cat > apps/web/src/app/tools/check-math-with-mathjs/actions.ts << 'EOF'
'use server';

import { checkMathWithMathJsTool } from '@roast/ai';
import { auth } from '@/lib/auth';
import { logger } from '@/lib/logger';

export async function checkMathWithMathJs(text: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Not authenticated');
  }

  try {
    const result = await checkMathWithMathJsTool.execute(
      { text },
      { userId: session.user.id, logger }
    );
    return result;
  } catch (error) {
    logger.error('Check math with MathJS error:', error);
    throw error;
  }
}
EOF

# Fix check-spelling-grammar page
cat > apps/web/src/app/tools/check-spelling-grammar/page.tsx << 'EOF'
'use client';

import { useState } from 'react';
import { CheckCircleIcon, XCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/solid';
import { checkSpellingGrammarTool } from '@roast/ai';
import { runToolWithAuth } from '@/app/tools/utils/runToolWithAuth';

const checkToolPath = checkSpellingGrammarTool.config.path;

export default function CheckSpellingGrammarPage() {
  const [text, setText] = useState('');
  const [result, setResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheck = async () => {
    if (!text.trim()) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await runToolWithAuth(checkToolPath, {
        text,
        generateComments: true,
        gradeDocument: true
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Check Spelling & Grammar</h1>
        <p className="text-gray-600">
          Identify spelling and grammar errors in your text with AI-powered analysis.
        </p>
      </div>

      <div className="space-y-6">
        <div>
          <label htmlFor="text" className="block text-sm font-medium text-gray-700 mb-2">
            Enter text to check
          </label>
          <textarea
            id="text"
            rows={10}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            placeholder="Enter your text here..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </div>

        <button
          onClick={handleCheck}
          disabled={isLoading || !text.trim()}
          className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Checking...' : 'Check Text'}
        </button>

        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {result && (
          <div className="space-y-6">
            {result.grade && (
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Document Grade</h2>
                <div className="flex items-center space-x-4">
                  <div className="text-3xl font-bold">{result.grade.overallGrade}</div>
                  <div className="text-sm text-gray-600">
                    <p>Errors: {result.grade.errorCount}</p>
                    <p>Words: {result.grade.wordCount}</p>
                  </div>
                </div>
                {result.grade.reasoning && (
                  <p className="mt-4 text-sm text-gray-600">{result.grade.reasoning}</p>
                )}
              </div>
            )}

            {result.summary && (
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-2">Summary</h2>
                <p className="text-gray-600">{result.summary}</p>
              </div>
            )}

            {result.errors && result.errors.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-medium text-gray-900">Errors Found</h2>
                {result.errors.map((error: any, index: number) => (
                  <div key={index} className="bg-white shadow rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      {error.severity === 'error' ? (
                        <XCircleIcon className="h-5 w-5 text-red-500 mt-0.5" />
                      ) : (
                        <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{error.type}</p>
                        <p className="text-sm text-gray-600 mt-1">{error.message}</p>
                        {error.context && (
                          <p className="text-sm text-gray-500 mt-2 font-mono bg-gray-50 p-2 rounded">
                            {error.context.before}
                            <span className="text-red-600 font-bold">{error.context.text}</span>
                            {error.context.after}
                          </p>
                        )}
                        {error.suggestions && error.suggestions.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs text-gray-500">Suggestions:</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {error.suggestions.map((suggestion: string, idx: number) => (
                                <span key={idx} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                                  {suggestion}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {result.comments && result.comments.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-medium text-gray-900">Generated Comments</h2>
                {result.comments.map((comment: any, index: number) => (
                  <div key={index} className="bg-blue-50 rounded-lg p-4">
                    <p className="text-sm text-blue-900">{comment.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
EOF

# Continue with other tool pages...
echo "Tool page fixes completed!"