'use client';

import React from 'react';
import { ToolPageTemplate } from '@/components/tools/form-generators';
import { factCheckerTool } from '@/tools/fact-checker';

export default function FactCheckerPage() {
  return (
    <ToolPageTemplate
      tool={factCheckerTool}
      formConfig={{
        fieldOrder: ['claim', 'context', 'searchForEvidence'],
        fieldConfigs: {
          claim: {
            label: 'Factual Claim to Verify',
            placeholder: 'Enter a specific factual claim to fact-check...',
            helpText: 'Be specific and include exact numbers, dates, or details when possible',
            rows: 3
          },
          context: {
            label: 'Additional Context',
            placeholder: 'Optional: Provide background information about where this claim comes from...',
            helpText: 'Context helps provide more accurate fact-checking by understanding the source and intent',
            rows: 3
          },
          searchForEvidence: {
            label: 'Search for Additional Evidence',
            helpText: 'Enable to search for additional supporting or contradicting evidence'
          }
        },
        submitButtonText: 'Fact-Check Claim',
        submitButtonColor: 'red',
        examples: [
          {
            name: 'Historical Fact',
            description: 'Verify a historical claim with specific details',
            data: {
              claim: 'The Manhattan Project employed over 130,000 workers at its peak and cost approximately $2 billion.',
              context: 'This claim is from a history textbook about World War II and the development of nuclear weapons.',
              searchForEvidence: false
            }
          },
          {
            name: 'Scientific Claim',
            description: 'Check a scientific or technical fact',
            data: {
              claim: 'Quantum computers can solve certain problems exponentially faster than classical computers.',
              context: 'This is from a technology article discussing quantum computing advantages.',
              searchForEvidence: false
            }
          },
          {
            name: 'Statistical Claim',
            description: 'Verify specific numbers and statistics',
            data: {
              claim: 'Electric vehicle sales in Europe grew by 23% in Q3 2023 compared to the same period in 2022.',
              context: 'This statistic was cited in a business report about the automotive industry.',
              searchForEvidence: true
            }
          },
          {
            name: 'Recent Event',
            description: 'Check claims about recent events or developments',
            data: {
              claim: 'ChatGPT reached 100 million monthly active users faster than any other application in history.',
              context: 'This claim appeared in multiple tech news articles in early 2023.',
              searchForEvidence: false
            }
          }
        ]
      }}
      renderResults={(result) => {
        const typedResult = result as any;
        const factCheckResult = typedResult.result;
        
        if (!factCheckResult) {
          return (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="text-red-900">No fact-check result available.</p>
            </div>
          );
        }
        
        // Color scheme based on verdict
        const getVerdictColor = (verdict: string) => {
          switch (verdict) {
            case 'true': return 'green';
            case 'false': return 'red';
            case 'partially-true': return 'yellow';
            case 'unverifiable': return 'gray';
            case 'outdated': return 'orange';
            default: return 'gray';
          }
        };
        
        const getConfidenceColor = (confidence: string) => {
          switch (confidence) {
            case 'high': return 'green';
            case 'medium': return 'yellow';
            case 'low': return 'red';
            default: return 'gray';
          }
        };
        
        const verdictColor = getVerdictColor(factCheckResult.verdict);
        const confidenceColor = getConfidenceColor(factCheckResult.confidence);
        
        return (
          <div className="space-y-6">
            {/* Verdict Summary */}
            <div className={`rounded-lg border border-${verdictColor}-200 bg-${verdictColor}-50 p-6`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className={`text-xl font-bold text-${verdictColor}-900 capitalize`}>
                      {factCheckResult.verdict.replace('-', ' ')}
                    </h3>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-${confidenceColor}-100 text-${confidenceColor}-800`}>
                      {factCheckResult.confidence} confidence
                    </span>
                  </div>
                  <p className={`text-${verdictColor}-800 text-lg`}>
                    {factCheckResult.explanation}
                  </p>
                </div>
                <div className="ml-4">
                  {factCheckResult.verdict === 'true' && (
                    <svg className={`h-8 w-8 text-${verdictColor}-600`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                  {factCheckResult.verdict === 'false' && (
                    <svg className={`h-8 w-8 text-${verdictColor}-600`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                  {factCheckResult.verdict === 'partially-true' && (
                    <svg className={`h-8 w-8 text-${verdictColor}-600`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  )}
                  {factCheckResult.verdict === 'unverifiable' && (
                    <svg className={`h-8 w-8 text-${verdictColor}-600`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                  {factCheckResult.verdict === 'outdated' && (
                    <svg className={`h-8 w-8 text-${verdictColor}-600`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </div>
              </div>
            </div>

            {/* Corrections (if applicable) */}
            {factCheckResult.corrections && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                <h4 className="font-semibold text-blue-900 mb-2">Corrected Information:</h4>
                <p className="text-blue-800">{factCheckResult.corrections}</p>
              </div>
            )}

            {/* Supporting Evidence */}
            {factCheckResult.evidence && factCheckResult.evidence.length > 0 && (
              <div className="rounded-lg border border-gray-200 bg-white p-6">
                <h4 className="text-lg font-semibold mb-4">Supporting Evidence</h4>
                <ul className="space-y-2">
                  {factCheckResult.evidence.map((evidence: string, i: number) => (
                    <li key={i} className="flex items-start gap-2">
                      <svg className="h-4 w-4 text-gray-400 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-gray-700">{evidence}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Additional Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {factCheckResult.lastVerified && (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <h4 className="font-medium text-gray-900 mb-1">Last Verified</h4>
                  <p className="text-gray-600">{factCheckResult.lastVerified}</p>
                </div>
              )}
              
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <h4 className="font-medium text-gray-900 mb-1">Confidence Level</h4>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-sm font-medium bg-${confidenceColor}-100 text-${confidenceColor}-800`}>
                    {factCheckResult.confidence}
                  </span>
                  <span className="text-gray-600 text-sm">
                    {factCheckResult.confidence === 'high' && 'Multiple reliable sources confirm this'}
                    {factCheckResult.confidence === 'medium' && 'Good evidence but some uncertainty remains'}
                    {factCheckResult.confidence === 'low' && 'Limited evidence available'}
                  </span>
                </div>
              </div>
            </div>

            {/* Research Notes */}
            {typedResult.researchNotes && (
              <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
                <h4 className="font-semibold text-purple-900 mb-2">Research Notes:</h4>
                <p className="text-purple-800">{typedResult.researchNotes}</p>
              </div>
            )}

            {/* Raw JSON Data */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Raw LLM Response Data</h3>
              <div className="overflow-x-auto rounded-lg bg-gray-900 p-4 text-gray-100">
                <pre className="text-xs">
                  {JSON.stringify(typedResult, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        );
      }}
    />
  );
}