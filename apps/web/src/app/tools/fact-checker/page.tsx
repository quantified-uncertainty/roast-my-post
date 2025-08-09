'use client';

import { useState } from 'react';
import { ShieldCheckIcon } from '@heroicons/react/24/outline';
import { factCheckerTool, toolSchemas } from '@roast/ai';
import { TabbedToolPageLayout } from '../components/TabbedToolPageLayout';
import { ToolDocumentation } from '../components/ToolDocumentation';
import { runToolWithAuth } from '../utils/runToolWithAuth';

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
  const [text, setText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<FactCheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Get schemas from centralized registry
  const { inputSchema, outputSchema } = toolSchemas[factCheckerTool.config.id as keyof typeof toolSchemas];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await runToolWithAuth<{ text: string }, FactCheckResult>('/api/tools/fact-checker', { text });
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const examples = [
    "The Eiffel Tower is 324 meters tall and was built in 1889.",
    "COVID-19 vaccines contain microchips for tracking people.",
    "The human brain uses about 20% of the body's total energy.",
    "Climate change is caused by increased greenhouse gas emissions from human activities.",
    "The Great Wall of China is visible from space with the naked eye."
  ];

  // Try tab content (form and results)
  const tryContent = (
    <div className="space-y-6">
      <div className="bg-amber-50 border-l-4 border-amber-400 p-4">
        <p className="text-sm text-amber-700">Fact-checking results are based on AI analysis and available information. Always verify important claims through multiple reliable sources.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow-sm border">
        <div>
          <label htmlFor="text" className="block text-sm font-medium text-gray-700 mb-1">
            Text to Fact-Check <span className="text-red-500">*</span>
          </label>
          <textarea
            id="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            rows={8}
            placeholder="Enter text containing facts to check..."
            required
          />
        </div>

        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Example texts:</p>
          <div className="space-y-2">
            {examples.map((example, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setText(example)}
                className="block w-full text-left px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded border text-gray-700 transition-colors"
              >
                {example}
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading || !text.trim()}
          className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Checking Facts...' : 'Check Facts'}
        </button>
      </form>

      {error && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-800">Error: {error}</p>
        </div>
      )}

      {result && (
        <div className="mt-8">
          {renderResult(result)}
        </div>
      )}
    </div>
  );

  // README content
  const readmeContent = `# Fact Checker Tool

An AI-powered fact-checking tool that analyzes text to identify and verify factual claims. Provides verdicts with explanations, confidence scores, and source references.

## Overview

The Fact Checker tool uses advanced AI to:

1. **Extract Claims** - Identifies factual statements in the provided text
2. **Verify Information** - Cross-references claims against reliable knowledge sources
3. **Provide Verdicts** - Assigns accuracy ratings (TRUE, FALSE, MOSTLY_TRUE, etc.)
4. **Explain Reasoning** - Offers detailed explanations for each verdict
5. **Rate Confidence** - Provides confidence scores for assessment reliability

## Key Features

- **Multiple Verdict Types**: TRUE, FALSE, MOSTLY_TRUE, MOSTLY_FALSE, UNCLEAR, UNVERIFIABLE
- **Confidence Scoring**: Percentage confidence for each fact-check result
- **Source References**: Cites sources used for verification when available
- **Detailed Explanations**: Clear reasoning for each verdict
- **Batch Processing**: Handles multiple claims in a single text input

## Verdict Categories

- **TRUE**: The claim is factually accurate based on available evidence
- **FALSE**: The claim is demonstrably incorrect
- **MOSTLY_TRUE**: The claim is largely accurate but may have minor inaccuracies
- **MOSTLY_FALSE**: The claim contains significant inaccuracies but isn't entirely wrong
- **UNCLEAR**: Insufficient or conflicting evidence to make a determination
- **UNVERIFIABLE**: Cannot be verified due to lack of reliable sources

## Best Practices

1. **Use Multiple Sources**: Always cross-check important claims with multiple reliable sources
2. **Consider Context**: Factor in the context and nuance of claims
3. **Check Recency**: Verify that information is current, especially for rapidly changing topics
4. **Understand Limitations**: AI fact-checking has limitations and may not catch all nuances
5. **Critical Thinking**: Use results as a starting point, not a final authority

## Example Use Cases

### News Article Verification
\`\`\`
Verify claims in news articles about current events, statistics, or historical facts.
\`\`\`

### Research Paper Review
\`\`\`
Check factual statements in academic papers, reports, or research documents.
\`\`\`

### Social Media Posts
\`\`\`
Quickly verify claims made in social media posts or viral content.
\`\`\`

## Limitations

- Results are based on AI analysis and available training data
- May not have access to the most recent information
- Cannot verify highly specialized or niche claims without proper sources
- Should not be used as the sole source for critical fact-checking decisions
- Effectiveness varies with claim complexity and available evidence`;

  // Docs tab content
  const docsContent = (
    <ToolDocumentation 
      toolId={factCheckerTool.config.id}
      inputSchema={inputSchema}
      outputSchema={outputSchema}
      readmeContent={readmeContent}
    />
  );

  return (
    <TabbedToolPageLayout
      title={factCheckerTool.config.name}
      description={factCheckerTool.config.description}
      icon={<ShieldCheckIcon className="h-8 w-8 text-indigo-600" />}
      warning="Fact-checking results are based on AI analysis and available information. Always verify important claims through multiple reliable sources."
      tryContent={tryContent}
      docsContent={docsContent}
    />
  );
}