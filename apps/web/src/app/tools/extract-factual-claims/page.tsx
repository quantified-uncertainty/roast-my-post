'use client';

import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { extractFactualClaimsTool, toolSchemas } from '@roast/ai';
import { ToolPageTemplate } from '../components/ToolPageTemplate';

interface ExtractFactualClaimsResult {
  claims: Array<{
    claim: string;
    type: 'factual' | 'statistical' | 'historical' | 'scientific' | 'other';
    confidence: number;
    context?: string;
    verifiable: boolean;
  }>;
  metadata?: {
    totalClaims: number;
    processingTime?: number;
  };
  llmInteraction?: any;
}

function renderResult(result: ExtractFactualClaimsResult) {
  if (!result.claims || result.claims.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <p className="text-gray-600">No factual claims found in the provided text.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium text-gray-900">
        {result.claims.length} Factual Claims Extracted
      </h2>
      {result.claims.map((claim, index) => (
        <div key={index} className="bg-white shadow rounded-lg p-4">
          <p className="text-sm text-gray-900 mb-2 font-medium">{claim.claim}</p>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${
              claim.type === 'factual' ? 'text-blue-800 bg-blue-100' :
              claim.type === 'statistical' ? 'text-purple-800 bg-purple-100' :
              claim.type === 'historical' ? 'text-amber-800 bg-amber-100' :
              claim.type === 'scientific' ? 'text-green-800 bg-green-100' :
              'text-gray-800 bg-gray-100'
            }`}>
              {claim.type.toUpperCase()}
            </span>
            <span className={`text-xs px-2 py-1 rounded-full ${
              claim.verifiable ? 'text-green-800 bg-green-100' : 'text-red-800 bg-red-100'
            }`}>
              {claim.verifiable ? 'Verifiable' : 'Not Verifiable'}
            </span>
            <span className="text-xs text-gray-500">
              Confidence: {Math.round(claim.confidence * 100)}%
            </span>
          </div>
          {claim.context && (
            <p className="text-xs text-gray-600 mt-1">
              <strong>Context:</strong> {claim.context}
            </p>
          )}
        </div>
      ))}
      {result.metadata && (
        <div className="text-xs text-gray-500 mt-4">
          Total claims processed: {result.metadata.totalClaims}
          {result.metadata.processingTime && ` • Processing time: ${result.metadata.processingTime}ms`}
        </div>
      )}
    </div>
  );
}

export default function ExtractFactualClaimsPage() {
  // Get schemas directly from the generated schemas - no duplication!
  const { inputSchema, outputSchema } = toolSchemas[extractFactualClaimsTool.config.id as keyof typeof toolSchemas];

  const examples = [
    "The Great Wall of China was built over several centuries and stretches approximately 13,000 miles. It was constructed using various materials including stone, brick, and earth.",
    "In 2023, global temperatures rose by 1.2°C above pre-industrial levels. Sea levels have increased by 21cm since 1993 according to NASA data.",
    "Apple Inc. was founded in 1976 by Steve Jobs, Steve Wozniak, and Ronald Wayne. The company went public in 1980 with the largest IPO in history at that time.",
    "COVID-19 has infected over 700 million people worldwide as of 2024. The virus belongs to the coronavirus family and causes respiratory illness."
  ];

  return (
    <ToolPageTemplate<{ text: string }, ExtractFactualClaimsResult>
      title="Extract Factual Claims"
      description="Extract and classify factual claims from text using AI analysis. Identifies verifiable statements and categorizes them by type with confidence scores."
      icon={MagnifyingGlassIcon}
      warningMessage="Claim extraction is based on AI analysis. Review extracted claims for accuracy and completeness before using them for research or verification."
      inputLabel="Text to Analyze"
      inputPlaceholder="Enter text to extract factual claims from..."
      buttonText="Extract Claims"
      inputRows={10}
      examples={examples}
      toolId="extract-factual-claims"
      renderResult={renderResult}
      prepareInput={(text) => ({ text })}
      inputSchema={inputSchema}
      outputSchema={outputSchema}
      extractLlmInteraction={(result) => (result as any).llmInteraction}
    />
  );
}