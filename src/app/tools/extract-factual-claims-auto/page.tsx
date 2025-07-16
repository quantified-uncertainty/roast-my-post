'use client';

import React from 'react';
import { ToolPageTemplate } from '@/components/tools/form-generators';
import { extractFactualClaimsTool } from '@/tools/extract-factual-claims';

export default function ExtractFactualClaimsAutoPage() {
  return (
    <ToolPageTemplate
      tool={extractFactualClaimsTool}
      formConfig={{
        fieldOrder: ['text', 'checkContradictions', 'prioritizeVerification'],
        fieldConfigs: {
          text: {
            label: 'Text to Analyze',
            placeholder: 'Paste text containing factual statements and claims...',
            helpText: 'The tool will extract factual claims and check for internal contradictions',
            rows: 10
          },
          checkContradictions: {
            label: 'Check for Contradictions',
            helpText: 'Identify claims that contradict each other within the same text'
          },
          prioritizeVerification: {
            label: 'Prioritize Claims for Verification',
            helpText: 'Categorize claims by importance and verifiability'
          }
        },
        submitButtonText: 'Extract Claims',
        submitButtonColor: 'green',
        examples: [
          {
            name: 'Company Report with Contradictions',
            description: 'Text with conflicting information',
            data: {
              text: `Our company was founded in 1995 by John Smith and Sarah Johnson in San Francisco. We reached $1 billion in revenue in 2020, making us one of the fastest-growing tech companies.

In our 25-year history (the company was actually founded in 1997), we have expanded to 15 countries and employ over 5,000 people. John Smith, who founded the company alone in his garage, always believed in global expansion.

Our revenue grew from $800 million in 2019 to $1.2 billion in 2020, representing a 50% increase. This growth was driven by our new AI product line, which now accounts for 60% of our total revenue of $1 billion.`,
              checkContradictions: true,
              prioritizeVerification: true
            }
          },
          {
            name: 'Scientific Article',
            description: 'Research findings and data',
            data: {
              text: `A new study published in Nature reveals that Antarctic ice loss has accelerated by 280% since the 1990s. The research team analyzed satellite data from 1992 to 2020, finding that Antarctica is now losing 250 billion tons of ice per year.

The West Antarctic Ice Sheet accounts for 80% of the total ice loss, with the Antarctic Peninsula contributing 15% and East Antarctica 5%. Sea level rise from Antarctic melting has increased from 0.2mm per year in the 1990s to 0.6mm per year today.

If current trends continue, Antarctic ice loss could contribute up to 58cm to global sea level rise by 2100.`,
              checkContradictions: true,
              prioritizeVerification: true
            }
          },
          {
            name: 'Historical Account',
            data: {
              text: `The Apollo 11 mission launched on July 16, 1969, from Kennedy Space Center. Neil Armstrong became the first human to walk on the moon on July 20, 1969, at 20:17 UTC. His famous words "That's one small step for man, one giant leap for mankind" were broadcast to an estimated 650 million viewers worldwide.

The mission lasted 8 days, 3 hours, 18 minutes, and 35 seconds. The lunar module spent 21 hours and 36 minutes on the moon's surface.`,
              checkContradictions: false,
              prioritizeVerification: true
            }
          }
        ]
      }}
      renderResults={(result) => {
        const typedResult = result as any;
        
        return (
          <div className="space-y-6">
            {/* Summary */}
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <p className="text-green-900">
                Extracted <span className="font-semibold">{typedResult.claims.length}</span> factual claims.
                {typedResult.contradictions && typedResult.contradictions.length > 0 && (
                  <span className="text-red-700"> Found {typedResult.contradictions.length} contradictions!</span>
                )}
              </p>
            </div>

            {/* Contradictions (if any) */}
            {typedResult.contradictions && typedResult.contradictions.length > 0 && (
              <div className="bg-red-50 p-6 rounded-lg border border-red-200">
                <h3 className="text-lg font-semibold mb-3 text-red-900">⚠️ Contradictions Found</h3>
                <div className="space-y-4">
                  {typedResult.contradictions.map((contradiction: any, i: number) => (
                    <div key={i} className="bg-white p-4 rounded border border-red-200">
                      <div className="space-y-2">
                        <div>
                          <span className="font-medium text-sm text-red-700">Claim 1:</span>
                          <p className="text-sm mt-1">{contradiction.claim1}</p>
                        </div>
                        <div>
                          <span className="font-medium text-sm text-red-700">Claim 2:</span>
                          <p className="text-sm mt-1">{contradiction.claim2}</p>
                        </div>
                        <div>
                          <span className="font-medium text-sm text-red-700">Explanation:</span>
                          <p className="text-sm mt-1 text-gray-700">{contradiction.explanation}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Claims by priority */}
            {typedResult.claimsByPriority ? (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Claims by Verification Priority</h3>
                
                {/* High priority claims */}
                {typedResult.claimsByPriority.high && typedResult.claimsByPriority.high.length > 0 && (
                  <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                    <h4 className="font-medium mb-2 text-red-900">High Priority ({typedResult.claimsByPriority.high.length})</h4>
                    <p className="text-xs text-red-700 mb-3">Important claims that should be verified first</p>
                    <ul className="space-y-2">
                      {typedResult.claimsByPriority.high.map((claim: any, i: number) => (
                        <li key={i} className="text-sm">
                          • {claim.claim}
                          {claim.reason && (
                            <span className="text-xs text-gray-600 ml-2">({claim.reason})</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {/* Medium priority claims */}
                {typedResult.claimsByPriority.medium && typedResult.claimsByPriority.medium.length > 0 && (
                  <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                    <h4 className="font-medium mb-2 text-yellow-900">Medium Priority ({typedResult.claimsByPriority.medium.length})</h4>
                    <p className="text-xs text-yellow-700 mb-3">Claims that would benefit from verification</p>
                    <ul className="space-y-2">
                      {typedResult.claimsByPriority.medium.map((claim: any, i: number) => (
                        <li key={i} className="text-sm">
                          • {claim.claim}
                          {claim.reason && (
                            <span className="text-xs text-gray-600 ml-2">({claim.reason})</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {/* Low priority claims */}
                {typedResult.claimsByPriority.low && typedResult.claimsByPriority.low.length > 0 && (
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <h4 className="font-medium mb-2 text-gray-700">Low Priority ({typedResult.claimsByPriority.low.length})</h4>
                    <p className="text-xs text-gray-600 mb-3">Common knowledge or less critical claims</p>
                    <ul className="space-y-2">
                      {typedResult.claimsByPriority.low.map((claim: any, i: number) => (
                        <li key={i} className="text-sm">
                          • {claim.claim}
                          {claim.reason && (
                            <span className="text-xs text-gray-600 ml-2">({claim.reason})</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              // Simple list if not prioritized
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <h3 className="text-lg font-semibold mb-3">Extracted Claims</h3>
                <ul className="space-y-2">
                  {typedResult.claims.map((claim: any, i: number) => (
                    <li key={i} className="text-sm">
                      • {typeof claim === 'string' ? claim : claim.claim}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Summary insights */}
            {typedResult.summary && (
              <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                <h3 className="text-lg font-semibold mb-3">Analysis Summary</h3>
                <p className="text-gray-700 whitespace-pre-wrap">{typedResult.summary}</p>
              </div>
            )}
          </div>
        );
      }}
    />
  );
}