'use client';

import { useState } from 'react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { extractFactualClaimsTool, toolSchemas } from '@roast/ai';
import { TabbedToolPageLayout } from '../components/TabbedToolPageLayout';
import { ToolDocumentation } from '../components/ToolDocumentation';
import { runToolWithAuth } from '../utils/runToolWithAuth';

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
  const [text, setText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ExtractFactualClaimsResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Get schemas from centralized registry
  const { inputSchema, outputSchema } = toolSchemas[extractFactualClaimsTool.config.id as keyof typeof toolSchemas];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await runToolWithAuth<{ text: string }, ExtractFactualClaimsResult>('/api/tools/extract-factual-claims', { text });
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const examples = [
    "The Great Wall of China was built over several centuries and stretches approximately 13,000 miles. It was constructed using various materials including stone, brick, and earth.",
    "In 2023, global temperatures rose by 1.2°C above pre-industrial levels. Sea levels have increased by 21cm since 1993 according to NASA data.",
    "Apple Inc. was founded in 1976 by Steve Jobs, Steve Wozniak, and Ronald Wayne. The company went public in 1980 with the largest IPO in history at that time.",
    "COVID-19 has infected over 700 million people worldwide as of 2024. The virus belongs to the coronavirus family and causes respiratory illness."
  ];

  // Try tab content (form and results)
  const tryContent = (
    <div className="space-y-6">
      <div className="bg-amber-50 border-l-4 border-amber-400 p-4">
        <p className="text-sm text-amber-700">Claim extraction is based on AI analysis. Review extracted claims for accuracy and completeness before using them for research or verification.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow-sm border">
        <div>
          <label htmlFor="text" className="block text-sm font-medium text-gray-700 mb-1">
            Text to Analyze <span className="text-red-500">*</span>
          </label>
          <textarea
            id="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            rows={10}
            placeholder="Enter text to extract factual claims from..."
            required
          />
        </div>

        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Example texts:</p>
          <div className="space-y-2">
            {examples.map((example: string, i: number) => (
              <button
                key={i}
                type="button"
                onClick={() => setText(example)}
                className="block w-full text-left px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded border text-gray-700 transition-colors"
              >
                {example.substring(0, 100)}...
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading || !text.trim()}
          className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Extracting Claims...' : 'Extract Claims'}
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
  const readmeContent = `# Extract Factual Claims Tool

An AI-powered tool for extracting and categorizing factual claims from text. Identifies verifiable statements and classifies them by type with confidence scores.

## Overview

The Extract Factual Claims tool uses advanced AI to:

1. **Identify Claims** - Extracts factual statements from text
2. **Classify Types** - Categorizes claims as factual, statistical, historical, scientific, or other
3. **Assess Verifiability** - Determines if claims can be verified through external sources
4. **Rate Confidence** - Provides confidence scores for each extracted claim
5. **Provide Context** - Includes contextual information where relevant

## Key Features

- **Multi-type Classification**: Factual, statistical, historical, scientific, and other claim types
- **Verifiability Assessment**: Indicates whether claims can be independently verified
- **Confidence Scoring**: Percentage confidence for extraction accuracy
- **Contextual Information**: Additional context for better understanding
- **Batch Processing**: Handles multiple claims in a single text input
- **Performance Metrics**: Processing time and claim count statistics

## Claim Types

### Factual Claims
- General factual statements about events, people, or things
- Example: "The capital of France is Paris"

### Statistical Claims
- Numerical data, percentages, measurements, or statistics
- Example: "The unemployment rate increased by 2.3% in 2023"

### Historical Claims
- Statements about past events, dates, or historical facts
- Example: "World War II ended in 1945"

### Scientific Claims
- Scientific facts, research findings, or technical information
- Example: "Water boils at 100°C at sea level"

### Other Claims
- Claims that don't fit into the above categories
- May include subjective or opinion-based statements incorrectly identified as factual

## Verifiability Assessment

### Verifiable Claims
- Can be checked against reliable external sources
- Typically include specific facts, dates, numbers, or well-documented events
- Suitable for fact-checking processes

### Non-Verifiable Claims
- Cannot be easily verified through standard sources
- May include opinions, predictions, or subjective statements
- Require careful evaluation before use in research

## Best Practices

1. **Review All Claims**: AI extraction may miss subtle nuances or context
2. **Verify Important Claims**: Always fact-check extracted claims through reliable sources
3. **Consider Context**: Understand the broader context in which claims are made
4. **Check Confidence Scores**: Higher confidence indicates more reliable extraction
5. **Validate Classification**: Ensure claim types are correctly categorized

## Use Cases

### Research Analysis
\`\`\`
Extract factual claims from research papers, articles, or reports for analysis.
\`\`\`

### Content Verification
\`\`\`
Identify claims in articles or documents that need fact-checking.
\`\`\`

### Information Organization
\`\`\`
Systematically organize factual information from large text documents.
\`\`\`

### Quality Assurance
\`\`\`
Review content to ensure all factual claims are properly supported.
\`\`\`

## Integration Workflow

This tool works well in combination with:
1. **Fact Checker Tool** - Verify extracted claims for accuracy
2. **Perplexity Research Tool** - Find additional sources for claim verification
3. **Link Validator Tool** - Check sources and references mentioned in claims

## Limitations

- May extract opinion statements as factual claims in some cases
- Effectiveness varies with text complexity and domain specificity
- Cannot verify the accuracy of extracted claims (only identifies them)
- May miss implicit or contextually dependent claims
- Performance may vary with different writing styles and formats

## Example Output

For the input "The Eiffel Tower is 324 meters tall and was completed in 1889":

- **Claim 1**: "The Eiffel Tower is 324 meters tall"
  - Type: Statistical
  - Verifiable: Yes
  - Confidence: 95%

- **Claim 2**: "The Eiffel Tower was completed in 1889"
  - Type: Historical
  - Verifiable: Yes
  - Confidence: 98%`;

  // Docs tab content
  const docsContent = (
    <ToolDocumentation 
      toolId={extractFactualClaimsTool.config.id}
      inputSchema={inputSchema}
      outputSchema={outputSchema}
      readmeContent={readmeContent}
    />
  );

  return (
    <TabbedToolPageLayout
      title={extractFactualClaimsTool.config.name}
      description={extractFactualClaimsTool.config.description}
      icon={<MagnifyingGlassIcon className="h-8 w-8 text-indigo-600" />}
      warning="Claim extraction is based on AI analysis. Review extracted claims for accuracy and completeness before using them for research or verification."
      tryContent={tryContent}
      docsContent={docsContent}
    />
  );
}