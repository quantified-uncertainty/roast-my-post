'use client';

import { ShieldCheckIcon } from '@heroicons/react/24/outline';
import { GenericToolPage } from '../components/GenericToolPage';
import { ClaimListDisplay, StatsSummary } from '../components/results';
import { toolExamples } from '../utils/exampleTexts';

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

export default function FactCheckerPage() {
  const renderResult = (result: FactCheckResult) => {
    return (
      <>
        {result.summary && (
          <StatsSummary
            title="Fact Check Summary"
            columns={5}
            stats={[
              { label: 'Total', value: result.summary.totalClaims, color: 'gray' },
              { label: 'True', value: result.summary.trueClaims, color: 'green' },
              { label: 'False', value: result.summary.falseClaims, color: 'red' },
              { label: 'Misleading', value: result.summary.misleadingClaims, color: 'yellow' },
              { label: 'Unverifiable', value: result.summary.unverifiableClaims, color: 'gray' }
            ]}
          />
        )}
        
        <div className="mt-6">
          <ClaimListDisplay
            claims={result.claims}
            title="Fact Check Results"
            showSources={true}
            showConfidence={true}
            noClaimsMessage="No claims to fact check"
          />
        </div>
      </>
    );
  };

  const exampleText = toolExamples['fact-checker'] as string;

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
          required: true,
          helperText: 'The tool will identify and verify factual claims'
        }
      ]}
      renderResult={renderResult}
      exampleInput={{ text: exampleText }}
      exampleText="Load example claims"
      submitButtonText="Check Facts"
      loadingText="Checking Facts..."
      validateInput={(input) => {
        if (!input.text.trim()) return 'Please enter some text to fact check';
        if (input.text.length < 10) return 'Text must be at least 10 characters';
        return true;
      }}
      warning="Fact checking uses AI and may not be 100% accurate. Always verify important claims through multiple sources."
    />
  );
}