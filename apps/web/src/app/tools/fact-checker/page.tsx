'use client';

import { ShieldCheckIcon } from '@heroicons/react/24/outline';
import { GenericToolPage } from '../components/GenericToolPage';
import { ClaimListDisplay, StatsSummary } from '../components/results';
import { examples } from './examples';

interface FactCheckResult {
  claims: Array<{
    claim: string;
    verdict: 'true' | 'false' | 'partially-true' | 'unverifiable' | 'outdated';
    confidence: 'high' | 'medium' | 'low';
    explanation: string;
    sources?: Array<{ title: string; url: string }>;
  }>;
  summary?: {
    totalClaims: number;
    trueClaims: number;
    falseClaims: number;
    partiallyTrueClaims: number;
    unverifiableClaims: number;
    outdatedClaims: number;
  };
}

export default function FactCheckerPage() {
  const renderResult = (result: FactCheckResult) => {
    // Transform confidence to numeric for ClaimListDisplay
    const transformedClaims = result.claims.map(claim => ({
      ...claim,
      confidence: claim.confidence === 'high' ? 90 : claim.confidence === 'medium' ? 60 : 30,
      verdict: claim.verdict === 'partially-true' ? 'misleading' as const : claim.verdict,
      sources: claim.sources?.map(s => s.url)
    }));

    return (
      <>
        {result.summary && (
          <StatsSummary
            title="Fact Check Summary"
            columns={6}
            stats={[
              { label: 'Total', value: result.summary.totalClaims, color: 'gray' },
              { label: 'True', value: result.summary.trueClaims, color: 'green' },
              { label: 'False', value: result.summary.falseClaims, color: 'red' },
              { label: 'Partial', value: result.summary.partiallyTrueClaims, color: 'yellow' },
              { label: 'Unverifiable', value: result.summary.unverifiableClaims, color: 'gray' },
              { label: 'Outdated', value: result.summary.outdatedClaims, color: 'gray' }
            ]}
          />
        )}
        
        <div className="mt-6">
          <ClaimListDisplay
            claims={transformedClaims}
            title="Fact Check Results"
            showSources={true}
            showConfidence={true}
            noClaimsMessage="No claims to fact check"
          />
        </div>
      </>
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
          required: true,
          helperText: 'The tool will identify and verify factual claims'
        }
      ]}
      renderResult={renderResult}
      exampleInputs={examples ? examples.map((ex, i) => ({
        label: `Example ${i + 1}`,
        value: { text: ex }
      })) : undefined}
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