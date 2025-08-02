#!/bin/bash

echo "Fixing remaining tool pages..."

# Fix extract-factual-claims page
cat > apps/web/src/app/tools/extract-factual-claims/page.tsx << 'EOF'
'use client';

import { useState } from 'react';
import { extractFactualClaimsTool } from '@roast/ai';
import { runToolWithAuth } from '@/app/tools/utils/runToolWithAuth';

const checkToolPath = extractFactualClaimsTool.config.path;

export default function ExtractFactualClaimsPage() {
  const [text, setText] = useState('');
  const [result, setResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExtract = async () => {
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Extract Factual Claims</h1>
        <p className="text-gray-600">
          Extract and analyze factual claims from text for fact-checking.
        </p>
      </div>

      <div className="space-y-6">
        <div>
          <label htmlFor="text" className="block text-sm font-medium text-gray-700 mb-2">
            Enter text to analyze
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
          onClick={handleExtract}
          disabled={isLoading || !text.trim()}
          className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Extracting...' : 'Extract Claims'}
        </button>

        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {result && result.claims && (
          <div className="space-y-4">
            <h2 className="text-lg font-medium text-gray-900">
              {result.claims.length} Claims Found
            </h2>
            {result.claims.map((claim: any, index: number) => (
              <div key={index} className="bg-white shadow rounded-lg p-4">
                <p className="text-sm text-gray-900 mb-2">{claim.originalText}</p>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">
                    Quality: {claim.qualityScore}%
                  </span>
                  {claim.category && (
                    <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded">
                      {claim.category}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
EOF

# Fix extract-forecasting-claims page
cat > apps/web/src/app/tools/extract-forecasting-claims/page.tsx << 'EOF'
'use client';

import { useState } from 'react';
import { CheckCircleIcon, ExclamationTriangleIcon, XCircleIcon } from '@heroicons/react/24/solid';
import { extractForecastingClaimsTool } from '@roast/ai';
import { runToolWithAuth } from '@/app/tools/utils/runToolWithAuth';

const checkToolPath = extractForecastingClaimsTool.config.path;

export default function ExtractForecastingClaimsPage() {
  const [text, setText] = useState('');
  const [result, setResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExtract = async () => {
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

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 70) return CheckCircleIcon;
    if (score >= 40) return ExclamationTriangleIcon;
    return XCircleIcon;
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Extract Forecasting Claims</h1>
        <p className="text-gray-600">
          Extract and analyze predictions and forecasts from text.
        </p>
      </div>

      <div className="space-y-6">
        <div>
          <label htmlFor="text" className="block text-sm font-medium text-gray-700 mb-2">
            Enter text with predictions
          </label>
          <textarea
            id="text"
            rows={10}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            placeholder="Enter text containing predictions or forecasts..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </div>

        <button
          onClick={handleExtract}
          disabled={isLoading || !text.trim()}
          className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Extracting...' : 'Extract Forecasts'}
        </button>

        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {result && result.forecasts && (
          <div className="space-y-4">
            <h2 className="text-lg font-medium text-gray-900">
              {result.forecasts.length} Forecasts Found
            </h2>
            {result.forecasts.map((forecast: any, index: number) => (
              <div key={index} className="bg-white shadow rounded-lg p-6">
                <p className="text-gray-900 mb-4">{forecast.originalText}</p>
                
                {forecast.rewrittenPredictionText && (
                  <div className="bg-blue-50 rounded p-3 mb-4">
                    <p className="text-sm text-blue-900">
                      <strong>Clarified:</strong> {forecast.rewrittenPredictionText}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {['precisionScore', 'verifiabilityScore', 'importanceScore', 'robustnessScore'].map((scoreType) => {
                    const score = forecast[scoreType];
                    if (score === undefined) return null;
                    const Icon = getScoreIcon(score);
                    return (
                      <div key={scoreType} className="text-center">
                        <Icon className={`h-6 w-6 mx-auto mb-1 ${getScoreColor(score)}`} />
                        <p className="text-xs text-gray-500">{scoreType.replace('Score', '')}</p>
                        <p className={`text-lg font-semibold ${getScoreColor(score)}`}>{score}</p>
                      </div>
                    );
                  })}
                </div>

                {(forecast.resolutionDate || forecast.authorProbability) && (
                  <div className="mt-4 flex flex-wrap gap-4 text-sm">
                    {forecast.resolutionDate && (
                      <span className="text-gray-600">
                        <strong>Resolution:</strong> {forecast.resolutionDate}
                      </span>
                    )}
                    {forecast.authorProbability && (
                      <span className="text-gray-600">
                        <strong>Probability:</strong> {forecast.authorProbability}%
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
EOF

# Fix extract-math-expressions page
cat > apps/web/src/app/tools/extract-math-expressions/page.tsx << 'EOF'
'use client';

import { useState } from 'react';
import { extractMathExpressionsTool } from '@roast/ai';
import { runToolWithAuth } from '@/app/tools/utils/runToolWithAuth';

const checkToolPath = extractMathExpressionsTool.config.path;

export default function ExtractMathExpressionsPage() {
  const [text, setText] = useState('');
  const [result, setResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Extract Math Expressions</h1>
        <p className="text-gray-600">
          Extract and verify mathematical expressions from text.
        </p>
      </div>

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
    </div>
  );
}
EOF

# Fix fuzzy-text-locator page
cat > apps/web/src/app/tools/fuzzy-text-locator/page.tsx << 'EOF'
'use client';

import { useState } from 'react';
import { fuzzyTextLocatorTool, TextLocationFinderOutput } from '@roast/ai';
import { runToolWithAuth } from '@/app/tools/utils/runToolWithAuth';

const checkToolPath = fuzzyTextLocatorTool.config.path;

export default function FuzzyTextLocatorPage() {
  const [documentText, setDocumentText] = useState('');
  const [targetText, setTargetText] = useState('');
  const [result, setResult] = useState<TextLocationFinderOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!documentText.trim() || !targetText.trim()) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await runToolWithAuth(checkToolPath, { 
        documentText,
        targetText 
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Fuzzy Text Locator</h1>
        <p className="text-gray-600">
          Find text in documents using fuzzy matching algorithms.
        </p>
      </div>

      <div className="space-y-6">
        <div>
          <label htmlFor="documentText" className="block text-sm font-medium text-gray-700 mb-2">
            Document Text
          </label>
          <textarea
            id="documentText"
            rows={8}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            placeholder="Enter the document text to search in..."
            value={documentText}
            onChange={(e) => setDocumentText(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="targetText" className="block text-sm font-medium text-gray-700 mb-2">
            Text to Find
          </label>
          <textarea
            id="targetText"
            rows={3}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            placeholder="Enter the text you want to find..."
            value={targetText}
            onChange={(e) => setTargetText(e.target.value)}
          />
        </div>

        <button
          onClick={handleSearch}
          disabled={isLoading || !documentText.trim() || !targetText.trim()}
          className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Searching...' : 'Search'}
        </button>

        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {result && (
          <div className="space-y-4">
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Search Result</h2>
              {result.found ? (
                <div className="space-y-2">
                  <p className="text-green-600 font-medium">✓ Text found</p>
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-sm text-gray-600">
                      <strong>Position:</strong> Characters {result.start} - {result.end}
                    </p>
                    <p className="text-sm text-gray-600">
                      <strong>Confidence:</strong> {Math.round((result.confidence || 0) * 100)}%
                    </p>
                  </div>
                  {result.actualText && (
                    <div className="mt-3">
                      <p className="text-sm font-medium text-gray-700">Found text:</p>
                      <p className="text-sm bg-yellow-50 p-2 rounded mt-1 font-mono">
                        {result.actualText}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-red-600">✗ Text not found</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
EOF

# Fix fact-checker page
cat > apps/web/src/app/tools/fact-checker/page.tsx << 'EOF'
'use client';

import { useState } from 'react';
import { factCheckerTool } from '@roast/ai';
import { runToolWithAuth } from '@/app/tools/utils/runToolWithAuth';

const checkToolPath = factCheckerTool.config.path;

export default function FactCheckerPage() {
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Fact Checker</h1>
        <p className="text-gray-600">
          Check facts and verify claims using AI-powered analysis.
        </p>
      </div>

      <div className="space-y-6">
        <div>
          <label htmlFor="text" className="block text-sm font-medium text-gray-700 mb-2">
            Enter text to fact-check
          </label>
          <textarea
            id="text"
            rows={10}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            placeholder="Enter text containing facts to check..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </div>

        <button
          onClick={handleCheck}
          disabled={isLoading || !text.trim()}
          className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Checking...' : 'Check Facts'}
        </button>

        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {result && result.checkedClaims && (
          <div className="space-y-4">
            <h2 className="text-lg font-medium text-gray-900">
              {result.checkedClaims.length} Claims Checked
            </h2>
            {result.checkedClaims.map((claim: any, index: number) => (
              <div key={index} className="bg-white shadow rounded-lg p-4">
                <p className="text-sm text-gray-900 mb-2">{claim.claim}</p>
                <div className="flex items-start space-x-2">
                  <span className={`text-sm font-medium ${
                    claim.verdict === 'TRUE' ? 'text-green-600' :
                    claim.verdict === 'FALSE' ? 'text-red-600' :
                    claim.verdict === 'MOSTLY_TRUE' ? 'text-blue-600' :
                    claim.verdict === 'MOSTLY_FALSE' ? 'text-orange-600' :
                    'text-gray-600'
                  }`}>
                    {claim.verdict}
                  </span>
                  <p className="text-sm text-gray-600 flex-1">{claim.explanation}</p>
                </div>
                {claim.confidence && (
                  <p className="text-xs text-gray-500 mt-2">
                    Confidence: {Math.round(claim.confidence * 100)}%
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
EOF

# Fix forecaster-simple page
cat > apps/web/src/app/tools/forecaster-simple/page.tsx << 'EOF'
'use client';

import { useState } from 'react';
import { forecasterTool } from '@roast/ai';
import { runToolWithAuth } from '@/app/tools/utils/runToolWithAuth';

const checkToolPath = forecasterTool.config.path;

export default function ForecasterSimplePage() {
  const [question, setQuestion] = useState('');
  const [result, setResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleForecast = async () => {
    if (!question.trim()) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await runToolWithAuth(checkToolPath, { question });
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Forecaster (Simple)</h1>
        <p className="text-gray-600">
          Generate AI-powered forecasts for specific questions.
        </p>
      </div>

      <div className="space-y-6">
        <div>
          <label htmlFor="question" className="block text-sm font-medium text-gray-700 mb-2">
            Forecasting Question
          </label>
          <textarea
            id="question"
            rows={3}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            placeholder="Enter a question to forecast..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
        </div>

        <button
          onClick={handleForecast}
          disabled={isLoading || !question.trim()}
          className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Forecasting...' : 'Generate Forecast'}
        </button>

        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {result && (
          <div className="space-y-4">
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Forecast</h2>
              {result.prediction && (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Prediction</p>
                    <p className="text-2xl font-bold text-gray-900">{result.prediction.forecast}%</p>
                  </div>
                  {result.prediction.reasoning && (
                    <div>
                      <p className="text-sm font-medium text-gray-700">Reasoning</p>
                      <p className="text-sm text-gray-600 mt-1">{result.prediction.reasoning}</p>
                    </div>
                  )}
                  {result.prediction.confidence && (
                    <p className="text-sm text-gray-500">
                      Confidence: {result.prediction.confidence}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
EOF

echo "Remaining tool page fixes completed!"