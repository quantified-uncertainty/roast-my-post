'use client';

import { ShieldCheckIcon } from '@heroicons/react/24/outline';
import { GenericToolPage } from '../components/GenericToolPage';

interface FactCheckResult {
  claims: Array<{
    claim: string;
    verdict: 'true' | 'false' | 'unverifiable' | 'misleading';
    confidence: number;
    explanation: string;
    sources?: string[];
  }>;
  summary?: {
    totalClaims: number;
    trueClaims: number;
    falseClaims: number;
    unverifiableClaims: number;
    misleadingClaims: number;
  };
}

/**
 * Fact Checker tool using GenericToolPage
 * Before: ~220 lines
 * After: ~90 lines (59% reduction)
 */
export default function FactCheckerPageGeneric() {
  const renderResult = (result: FactCheckResult) => {
    const getVerdictColor = (verdict: string) => {
      switch (verdict) {
        case 'true': return 'bg-green-50 border-green-200 text-green-800';
        case 'false': return 'bg-red-50 border-red-200 text-red-800';
        case 'misleading': return 'bg-yellow-50 border-yellow-200 text-yellow-800';
        case 'unverifiable': return 'bg-gray-50 border-gray-200 text-gray-800';
        default: return 'bg-gray-50 border-gray-200 text-gray-800';
      }
    };

    return (
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Fact Check Results</h2>
        
        {result.summary && (
          <div className="grid grid-cols-5 gap-3 mb-6">
            <div className="text-center p-3 bg-gray-50 rounded">
              <p className="text-2xl font-bold">{result.summary.totalClaims}</p>
              <p className="text-xs text-gray-600">Total</p>
            </div>
            <div className="text-center p-3 bg-green-50 rounded">
              <p className="text-2xl font-bold text-green-600">{result.summary.trueClaims}</p>
              <p className="text-xs text-gray-600">True</p>
            </div>
            <div className="text-center p-3 bg-red-50 rounded">
              <p className="text-2xl font-bold text-red-600">{result.summary.falseClaims}</p>
              <p className="text-xs text-gray-600">False</p>
            </div>
            <div className="text-center p-3 bg-yellow-50 rounded">
              <p className="text-2xl font-bold text-yellow-600">{result.summary.misleadingClaims}</p>
              <p className="text-xs text-gray-600">Misleading</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded">
              <p className="text-2xl font-bold text-gray-600">{result.summary.unverifiableClaims}</p>
              <p className="text-xs text-gray-600">Unverifiable</p>
            </div>
          </div>
        )}
        
        <div className="space-y-4">
          {result.claims.map((claim, index) => (
            <div key={index} className={`p-4 rounded-lg border ${getVerdictColor(claim.verdict)}`}>
              <div className="flex items-start justify-between mb-2">
                <span className="font-medium capitalize">{claim.verdict}</span>
                <span className="text-sm">
                  {Math.round(claim.confidence * 100)}% confidence
                </span>
              </div>
              <p className="text-sm font-medium mb-2">"{claim.claim}"</p>
              <p className="text-sm">{claim.explanation}</p>
              {claim.sources && claim.sources.length > 0 && (
                <div className="mt-2 text-xs text-gray-600">
                  Sources: {claim.sources.join(', ')}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <GenericToolPage<{ text: string }, FactCheckResult>
      toolId="fact-checker"
      title="Fact Checker"
      description="Verify factual claims in text using AI-powered fact checking"
      icon={<ShieldCheckIcon className="h-8 w-8 text-indigo-600" />}
      fields={[
        {
          type: 'textarea',
          name: 'text',
          label: 'Text to Fact Check',
          placeholder: 'Enter text containing factual claims to verify...',
          rows: 8,
          required: true
        }
      ]}
      renderResult={renderResult}
      exampleInput={{
        text: "The Earth is flat. Water boils at 100°C at sea level. The Great Wall of China is visible from space. Humans only use 10% of their brain."
      }}
      exampleText="Load example claims"
      submitButtonText="Check Facts"
      loadingText="Checking Facts..."
      validateInput={(input) => {
        if (!input.text.trim()) return 'Please enter some text to fact check';
        if (input.text.length < 10) return 'Text must be at least 10 characters';
        return true;
      }}
    />
  );
}