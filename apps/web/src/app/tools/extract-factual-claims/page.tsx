'use client';

import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { GenericToolPage } from '../components/GenericToolPage';
import { ClaimListDisplay } from '../components/results';
import { examples } from './examples';

interface ExtractFactualClaimsResult {
  claims: Array<{
    originalText: string;
    topic: string;
    importanceScore: number;
    checkabilityScore: number;
    truthProbability: number;
  }>;
  summary?: {
    totalFound: number;
    aboveThreshold: number;
    averageQuality: number;
  };
}

export default function ExtractFactualClaimsPage() {
  const renderResult = (result: ExtractFactualClaimsResult) => {
    const claimsForDisplay = result.claims.map(claim => ({
      claim: claim.originalText,
      verdict: claim.truthProbability >= 70 ? 'verified' as const : 
              claim.truthProbability >= 50 ? 'unverified' as const :
              claim.truthProbability >= 30 ? 'misleading' as const : 'false' as const,
      confidence: claim.truthProbability / 100,
      type: claim.topic,
      importance: claim.importanceScore,
      evidence: `Checkability: ${claim.checkabilityScore}%, Truth probability: ${claim.truthProbability}%`
    }));

    return (
      <>
        {result.summary && (
          <div className="mb-6 grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-gray-50 rounded">
              <p className="text-2xl font-bold">{result.summary.totalFound}</p>
              <p className="text-xs text-gray-600">Total Found</p>
            </div>
            <div className="text-center p-3 bg-green-50 rounded">
              <p className="text-2xl font-bold text-green-600">{result.summary.aboveThreshold}</p>
              <p className="text-xs text-gray-600">Above Threshold</p>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded">
              <p className="text-2xl font-bold text-blue-600">{result.summary.averageQuality}%</p>
              <p className="text-xs text-gray-600">Avg Quality</p>
            </div>
          </div>
        )}
        
        <ClaimListDisplay
          claims={claimsForDisplay}
          title="Extracted Factual Claims"
          showSources={false}
          showConfidence={true}
          noClaimsMessage="No factual claims found in the text"
        />
      </>
    );
  };

  
  return (
    <GenericToolPage<{ text: string }, ExtractFactualClaimsResult>
      toolId="extract-factual-claims"
      title="Extract Factual Claims"
      description="Extract and analyze factual claims from text using AI"
      icon={<MagnifyingGlassIcon className="h-8 w-8 text-indigo-600" />}
      fields={[
        {
          type: 'textarea',
          name: 'text',
          label: 'Text to Analyze',
          placeholder: 'Enter text to extract factual claims from...',
          rows: 8,
          required: true,
          helperText: 'The tool will identify statements that make factual assertions'
        }
      ]}
      renderResult={renderResult}
      exampleInputs={examples ? examples.map((ex, i) => ({
        label: `Example ${i + 1}`,
        value: { text: ex }
      })) : undefined}
      submitButtonText="Extract Claims"
      loadingText="Extracting Claims..."
      validateInput={(input) => {
        if (!input.text.trim()) return 'Please enter some text to analyze';
        if (input.text.length < 20) return 'Text must be at least 20 characters';
        return true;
      }}
    />
  );
}