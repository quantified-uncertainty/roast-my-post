'use client';

import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { GenericToolPage } from '../components/GenericToolPage';
import { ClaimListDisplay } from '../components/results';
import { toolExamples } from '../utils/exampleTexts';

interface ExtractFactualClaimsResult {
  claims: Array<{
    claim: string;
    confidence: number;
    type: string;
    evidence?: string;
    verifiable: boolean;
  }>;
  summary?: {
    totalClaims: number;
    verifiableClaims: number;
    unverifiableClaims: number;
  };
}

export default function ExtractFactualClaimsPage() {
  const renderResult = (result: ExtractFactualClaimsResult) => {
    const claimsForDisplay = result.claims.map(claim => ({
      claim: claim.claim,
      verdict: claim.verifiable ? 'unverified' as const : 'unverifiable' as const,
      confidence: claim.confidence,
      type: claim.type,
      evidence: claim.evidence
    }));

    return (
      <>
        {result.summary && (
          <div className="mb-6 grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-gray-50 rounded">
              <p className="text-2xl font-bold">{result.summary.totalClaims}</p>
              <p className="text-xs text-gray-600">Total Claims</p>
            </div>
            <div className="text-center p-3 bg-green-50 rounded">
              <p className="text-2xl font-bold text-green-600">{result.summary.verifiableClaims}</p>
              <p className="text-xs text-gray-600">Verifiable</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded">
              <p className="text-2xl font-bold text-gray-600">{result.summary.unverifiableClaims}</p>
              <p className="text-xs text-gray-600">Unverifiable</p>
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

  const examples = toolExamples['extract-factual-claims'] as string[];
  const exampleText = examples[0];

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
      exampleInput={{ text: exampleText }}
      exampleText="Load example text"
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