'use client';

import React from 'react';
import { ToolPageTemplate } from '@/components/tools/form-generators';
import { factCheckTool } from '@/tools/fact-check';

export default function FactCheckAutoPage() {
  return (
    <ToolPageTemplate
      tool={factCheckTool}
      formConfig={{
        fieldOrder: ['text', 'context', 'maxClaims', 'verifyHighPriority'],
        fieldConfigs: {
          text: {
            label: 'Text to Fact-Check',
            placeholder: 'Paste the text you want to fact-check here...',
            helpText: 'The tool will extract and verify factual claims from this text',
            rows: 10
          },
          context: {
            label: 'Additional Context',
            placeholder: 'Provide any relevant context about the source or topic...',
            helpText: 'Optional context to help understand and verify the claims',
            rows: 3
          },
          maxClaims: {
            label: 'Maximum Claims to Extract',
            helpText: 'Limit the number of claims to analyze (1-50)',
            min: 1,
            max: 50,
            step: 1
          },
          verifyHighPriority: {
            label: 'Verify High-Priority Claims',
            helpText: 'Use Perplexity to verify important claims (adds ~$0.01-0.03 cost)'
          }
        },
        submitButtonText: 'Check Facts',
        submitButtonColor: 'green',
        examples: [
          {
            name: 'Economic Statistics',
            description: 'GDP and economic data claims',
            data: {
              text: `The GDP of the United States was $25.5 trillion in 2023, making it the world's largest economy. China's GDP was $17.9 trillion, while Japan's was $4.2 trillion. The US economy grew by 2.5% in 2023, outpacing most developed nations.
              
              The unemployment rate in the US dropped to 3.7% by the end of 2023, near historic lows. Inflation, which peaked at 9.1% in June 2022, fell to 3.4% by December 2023.`,
              context: 'Economic analysis article from early 2024',
              maxClaims: 20,
              verifyHighPriority: true
            }
          },
          {
            name: 'Scientific Claims',
            description: 'Space and astronomy facts',
            data: {
              text: `The James Webb Space Telescope, launched in December 2021, can see galaxies that formed just 300 million years after the Big Bang. It operates at the L2 Lagrange point, about 1.5 million kilometers from Earth.
              
              The telescope's primary mirror is 6.5 meters in diameter, made up of 18 hexagonal segments. It cost approximately $10 billion to build and deploy.`,
              maxClaims: 10,
              verifyHighPriority: true
            }
          },
          {
            name: 'Historical Facts',
            data: {
              text: `World War II began on September 1, 1939, when Germany invaded Poland. The war ended on September 2, 1945, with Japan's formal surrender. Approximately 70-85 million people died during the conflict, making it the deadliest war in human history.`,
              maxClaims: 15,
              verifyHighPriority: false
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
                Found <span className="font-semibold">{typedResult.claims.length}</span> factual claims.
                {typedResult.verificationResults && (
                  <span> Verified {typedResult.verificationResults.length} high-priority claims.</span>
                )}
              </p>
            </div>

            {/* Claims list */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Extracted Claims</h3>
              {typedResult.claims.map((claim: any, i: number) => (
                <div key={i} className="bg-white p-4 rounded-lg border border-gray-200">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span className="text-sm font-medium text-gray-600">Claim {i + 1}</span>
                      {claim.importance && (
                        <span className={`ml-2 text-xs px-2 py-1 rounded-full ${
                          claim.importance === 'high' 
                            ? 'bg-red-100 text-red-800'
                            : claim.importance === 'medium'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {claim.importance} importance
                        </span>
                      )}
                    </div>
                    {claim.confidence && (
                      <span className="text-sm text-gray-600">
                        {(claim.confidence * 100).toFixed(0)}% confidence
                      </span>
                    )}
                  </div>
                  
                  <p className="font-medium mb-2">{claim.text || claim.claim}</p>
                  
                  {claim.topic && (
                    <p className="text-sm text-gray-600 mb-2">
                      <span className="font-medium">Topic:</span> {claim.topic}
                    </p>
                  )}
                  
                  {claim.context && (
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Context:</span> {claim.context}
                    </p>
                  )}
                  
                  <div className="text-xs text-gray-500 mt-2">
                    <span className="mr-3">Importance: {claim.importance}</span>
                    <span>Specificity: {claim.specificity}</span>
                  </div>
                  
                  {/* Verification result if available */}
                  {typedResult.verificationResults?.find((v: any) => v.claimIndex === i) && (() => {
                    const verification = typedResult.verificationResults.find((v: any) => v.claimIndex === i);
                    return (
                      <div className={`mt-3 p-3 rounded ${
                        verification.verdict === 'supported' 
                          ? 'bg-green-50 border border-green-200'
                          : verification.verdict === 'disputed'
                          ? 'bg-red-50 border border-red-200'
                          : 'bg-yellow-50 border border-yellow-200'
                      }`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-sm">
                            Verification: {verification.verdict}
                          </span>
                          <span className="text-xs text-gray-600">
                            {verification.confidence}% confidence
                          </span>
                        </div>
                        <p className="text-sm">{verification.explanation}</p>
                        {verification.sources && verification.sources.length > 0 && (
                          <div className="mt-2">
                            <span className="text-xs font-medium">Sources:</span>
                            <ul className="text-xs text-gray-600 mt-1">
                              {verification.sources.map((source: string, idx: number) => (
                                <li key={idx}>• {source}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              ))}
            </div>

            {/* Summary statistics */}
            {typedResult.summary && (
              <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                <h3 className="text-lg font-semibold mb-3">Summary Statistics</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Total claims:</span>
                    <span className="ml-2 font-medium">{typedResult.summary.totalClaims}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">High priority:</span>
                    <span className="ml-2 font-medium">{typedResult.summary.highPriority}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Medium priority:</span>
                    <span className="ml-2 font-medium">{typedResult.summary.mediumPriority}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Low priority:</span>
                    <span className="ml-2 font-medium">{typedResult.summary.lowPriority}</span>
                  </div>
                  {typedResult.summary.verified !== undefined && (
                    <>
                      <div>
                        <span className="text-gray-600">Verified:</span>
                        <span className="ml-2 font-medium">{typedResult.summary.verified}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Unverified:</span>
                        <span className="ml-2 font-medium">{typedResult.summary.unverified}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {typedResult.recommendations && typedResult.recommendations.length > 0 && (
              <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                <h3 className="text-lg font-semibold mb-3">Recommendations</h3>
                <ul className="space-y-2">
                  {typedResult.recommendations.map((rec: string, i: number) => (
                    <li key={i} className="text-sm">• {rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );
      }}
    />
  );
}