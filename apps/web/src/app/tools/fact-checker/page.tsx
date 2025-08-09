'use client';

import { ShieldCheckIcon } from '@heroicons/react/24/outline';
import { factCheckerTool } from '@roast/ai';
import { ToolPageTemplate } from '../components/ToolPageTemplate';

interface FactCheckResult {
  checkedClaims: Array<{
    claim: string;
    verdict: 'TRUE' | 'FALSE' | 'MOSTLY_TRUE' | 'MOSTLY_FALSE' | 'UNCLEAR' | 'UNVERIFIABLE';
    explanation: string;
    confidence?: number;
    sources?: string[];
  }>;
  metadata?: {
    totalClaims: number;
    processingTime?: number;
  };
  llmInteraction?: any;
}

function renderResult(result: FactCheckResult) {
  if (!result.checkedClaims || result.checkedClaims.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <p className="text-gray-600">No claims found to fact-check in the provided text.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium text-gray-900">
        {result.checkedClaims.length} Claims Checked
      </h2>
      {result.checkedClaims.map((claim, index) => (
        <div key={index} className="bg-white shadow rounded-lg p-4">
          <p className="text-sm text-gray-900 mb-2 font-medium">{claim.claim}</p>
          <div className="flex items-start space-x-2">
            <span className={`text-sm font-medium px-2 py-1 rounded-full ${
              claim.verdict === 'TRUE' ? 'text-green-800 bg-green-100' :
              claim.verdict === 'FALSE' ? 'text-red-800 bg-red-100' :
              claim.verdict === 'MOSTLY_TRUE' ? 'text-blue-800 bg-blue-100' :
              claim.verdict === 'MOSTLY_FALSE' ? 'text-orange-800 bg-orange-100' :
              claim.verdict === 'UNCLEAR' ? 'text-yellow-800 bg-yellow-100' :
              'text-gray-800 bg-gray-100'
            }`}>
              {claim.verdict.replace('_', ' ')}
            </span>
            <p className="text-sm text-gray-600 flex-1">{claim.explanation}</p>
          </div>
          {claim.confidence && (
            <p className="text-xs text-gray-500 mt-2">
              Confidence: {Math.round(claim.confidence * 100)}%
            </p>
          )}
          {claim.sources && claim.sources.length > 0 && (
            <div className="mt-2">
              <p className="text-xs text-gray-600 mb-1">Sources:</p>
              <ul className="text-xs text-gray-500 space-y-1">
                {claim.sources.map((source, idx) => (
                  <li key={idx}>• {source}</li>
                ))}
              </ul>
            </div>
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

export default function FactCheckerPage() {
  const inputSchema = {
    type: 'object',
    properties: {
      text: {
        type: 'string',
        description: 'Text containing claims to fact-check',
        minLength: 1,
        maxLength: 50000
      },
      maxClaims: {
        type: 'number',
        description: 'Maximum number of claims to check',
        default: 10,
        minimum: 1,
        maximum: 50
      },
      confidenceThreshold: {
        type: 'number',
        description: 'Minimum confidence threshold (0-1)',
        default: 0.7,
        minimum: 0,
        maximum: 1
      }
    },
    required: ['text']
  };

  const outputSchema = {
    type: 'object',
    properties: {
      checkedClaims: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            claim: { type: 'string', description: 'The extracted claim' },
            verdict: {
              type: 'string',
              enum: ['TRUE', 'FALSE', 'MOSTLY_TRUE', 'MOSTLY_FALSE', 'UNCLEAR', 'UNVERIFIABLE'],
              description: 'Fact-check verdict'
            },
            explanation: { type: 'string', description: 'Explanation of the verdict' },
            confidence: { type: 'number', minimum: 0, maximum: 1 },
            sources: { 
              type: 'array', 
              items: { type: 'string' },
              description: 'Sources used for verification'
            }
          }
        }
      },
      metadata: {
        type: 'object',
        properties: {
          totalClaims: { type: 'number' },
          processingTime: { type: 'number' }
        }
      }
    }
  };

  const examples = [
    "The Eiffel Tower is 324 meters tall and was built in 1889.",
    "COVID-19 vaccines contain microchips for tracking people.",
    "The human brain uses about 20% of the body's total energy.",
    "Climate change is caused by increased greenhouse gas emissions from human activities.",
    "The Great Wall of China is visible from space with the naked eye."
  ];

  return (
    <ToolPageTemplate<{ text: string }, FactCheckResult>
      title="Fact Checker"
      description="Check facts and verify claims using AI-powered analysis. Identifies factual claims in text and provides verdicts with explanations and confidence scores."
      icon={ShieldCheckIcon}
      warningMessage="Fact-checking results are based on AI analysis and available information. Always verify important claims through multiple reliable sources."
      inputLabel="Text to Fact-Check"
      inputPlaceholder="Enter text containing facts to check..."
      buttonText="Check Facts"
      inputRows={8}
      examples={examples}
      toolId="fact-checker"
      renderResult={renderResult}
      prepareInput={(text) => ({ text })}
      inputSchema={inputSchema}
      outputSchema={outputSchema}
      extractLlmInteraction={(result) => (result as any).llmInteraction}
    />
  );
}