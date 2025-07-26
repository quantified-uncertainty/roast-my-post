'use client';

import React from 'react';
import { ToolPageTemplate } from '@/components/tools/form-generators';
import { extractFactualClaimsTool } from '@/tools/extract-factual-claims';

export default function ExtractFactualClaimsAutoPage() {
  return (
    <ToolPageTemplate
      tool={extractFactualClaimsTool}
      formConfig={{
        fieldOrder: ['text', 'instructions', 'minQualityThreshold', 'maxClaims'],
        fieldConfigs: {
          text: {
            label: 'Text to Analyze',
            placeholder: 'Paste text containing factual statements and claims...',
            helpText: 'The tool will extract verifiable factual claims and score them for importance, checkability, and truth probability',
            rows: 10
          },
          instructions: {
            label: 'Additional Instructions',
            placeholder: 'Optional: Focus on specific types of claims (e.g., "focus on statistical claims" or "prioritize health-related facts")',
            helpText: 'Provide specific guidance for the extraction process',
            rows: 3
          },
          minQualityThreshold: {
            label: 'Minimum Quality Threshold',
            helpText: 'Only return claims with average score (importance + checkability) above this threshold (0-100)',
            placeholder: 'Default: 50',
            min: 0,
            max: 100,
            step: 5
          },
          maxClaims: {
            label: 'Maximum Claims',
            helpText: 'Maximum number of claims to extract (1-100). May return fewer if not enough quality claims found.',
            min: 1,
            max: 100,
            step: 1
          }
        },
        submitButtonText: 'Extract Factual Claims',
        submitButtonColor: 'green',
        examples: [
          {
            name: 'Company Financial Report',
            description: 'Business claims with statistics and facts',
            data: {
              text: `TechCorp Inc. was founded in 2010 by Sarah Chen and Mark Rodriguez in Austin, Texas. The company has grown from 3 employees to over 1,200 staff across 15 offices worldwide.

Revenue for fiscal year 2023 reached $450 million, representing a 35% increase from the previous year's $333 million. The Software-as-a-Service division accounted for 68% of total revenue, while consulting services contributed 32%.

Our flagship product, DataFlow Pro, serves over 50,000 active users daily and processes more than 2.5 petabytes of data monthly. The platform maintains 99.9% uptime and has zero recorded security breaches in the past 18 months.

The company went public in March 2022 at $28 per share on NASDAQ under ticker TECH. Current market capitalization exceeds $8.5 billion as of December 2023.`,
              instructions: 'Focus on verifiable business metrics and financial data',
              minQualityThreshold: 60,
              maxClaims: 15
            }
          },
          {
            name: 'Scientific Research Paper',
            description: 'Research findings with specific data points',
            data: {
              text: `Our randomized controlled trial included 1,847 participants aged 25-65 across 12 medical centers in North America. The study ran from January 2021 to September 2023, with a mean follow-up period of 18.5 months.

The primary endpoint showed a 42% reduction in cardiovascular events (p<0.001, 95% CI: 0.48-0.70) compared to placebo. Secondary analysis revealed a 28% decrease in all-cause mortality (HR=0.72, 95% CI: 0.58-0.89).

Adverse events occurred in 12.3% of treatment group participants versus 8.7% in the control group. The most common side effects were mild gastrointestinal symptoms (6.8%) and headaches (3.2%).

The drug demonstrated efficacy across all demographic subgroups, with particularly strong effects in patients over 50 years old (58% risk reduction) and those with diabetes (47% risk reduction).`,
              instructions: 'Extract precise statistical findings and study methodology facts',
              minQualityThreshold: 70,
              maxClaims: 12
            }
          },
          {
            name: 'Historical Document',
            description: 'Historical facts and dates',
            data: {
              text: `The Manhattan Project began in 1942 under the direction of General Leslie Groves and physicist J. Robert Oppenheimer. The project employed over 130,000 workers at its peak and cost approximately $2 billion (equivalent to $28 billion today).

The first successful nuclear test, codenamed "Trinity," took place on July 16, 1945, at 5:29 AM local time in New Mexico. The explosion was visible from 200 miles away and created a crater 340 meters wide.

Los Alamos National Laboratory was established in 1943 as the project's main research facility. The laboratory employed 6,000 people by 1945, including many of the world's leading physicists.

The project's uranium enrichment facility at Oak Ridge, Tennessee, consumed more electricity than New York City at the time.`,
              instructions: 'Focus on specific dates, numbers, and verifiable historical facts',
              minQualityThreshold: 65,
              maxClaims: 10
            }
          },
          {
            name: 'News Article with Mixed Claims',
            description: 'Contemporary claims of varying reliability',
            data: {
              text: `According to industry analysts, electric vehicle sales in Europe grew by 23% in Q3 2023 compared to the same period last year. Tesla remains the market leader with approximately 18% market share, followed by Volkswagen Group at 15%.

Government subsidies play a crucial role in adoption rates. Norway, which offers the most generous incentives, has achieved 87% EV market penetration. In contrast, countries with limited support see adoption rates below 5%.

Battery technology continues to improve rapidly. The latest lithium-ion batteries can now store 50% more energy than models from just three years ago. Some experts predict that solid-state batteries will revolutionize the industry within the next decade.

Charging infrastructure remains a challenge, with only 40% of European drivers living within 10 miles of a fast-charging station.`,
              instructions: 'Distinguish between hard data and expert predictions',
              minQualityThreshold: 55,
              maxClaims: 20
            }
          }
        ]
      }}
      renderResults={(result) => {
        const typedResult = result as any;
        
        // Calculate combined scores for display
        const claimsWithScores = (typedResult.claims || []).map((claim: any) => ({
          ...claim,
          combinedScore: Math.round((claim.importanceScore + claim.checkabilityScore) / 2)
        }));
        
        // Sort by combined score descending
        const sortedClaims = [...claimsWithScores].sort((a, b) => b.combinedScore - a.combinedScore);
        
        // Filter high priority claims (above threshold)
        const highPriorityClaims = sortedClaims.filter((claim: any) => claim.combinedScore >= 70);
        const questionableClaims = sortedClaims.filter((claim: any) => claim.truthProbability <= 40);
        const likelyFalseClaims = sortedClaims.filter((claim: any) => claim.truthProbability <= 30);
        
        return (
          <div className="space-y-6">
            {/* Summary */}
            <div className="rounded-lg border border-green-200 bg-green-50 p-4">
              <p className="text-green-900">
                Extracted <span className="font-semibold">{typedResult.claims?.length || 0}</span> factual claims.
                {typedResult.summary && (
                  <>
                    {' '}Found {typedResult.summary.totalFound} total claims, {typedResult.summary.aboveThreshold} above quality threshold.
                    {questionableClaims.length > 0 && (
                      <span className="text-orange-700">
                        {' '}{questionableClaims.length} claims have low truth probability (≤40%) and should be verified.
                      </span>
                    )}
                    {likelyFalseClaims.length > 0 && (
                      <span className="text-red-700">
                        {' '}{likelyFalseClaims.length} claims appear likely false (≤30% truth probability).
                      </span>
                    )}
                  </>
                )}
              </p>
            </div>

            {/* All claims list */}
            {sortedClaims && sortedClaims.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">All Extracted Claims</h3>
                <div className="rounded-lg border border-gray-200 bg-white p-4">
                  <ul className="space-y-3">
                    {sortedClaims.map((claim: any, i: number) => (
                      <li key={i} className="border-b border-gray-100 pb-3 last:border-b-0">
                        <div className="space-y-2">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">
                                {claim.originalText}
                              </p>
                              <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-600">
                                <span className="flex items-center gap-1">
                                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a2 2 0 012-2z" />
                                  </svg>
                                  Topic: {claim.topic}
                                </span>
                                <span className="flex items-center gap-1">
                                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  Truth Probability: {claim.truthProbability}%
                                </span>
                              </div>
                            </div>
                            <div className="ml-2 flex flex-col items-end gap-1">
                              <div className={`rounded px-3 py-1 text-xs font-medium ${
                                claim.combinedScore >= 80 ? 'bg-red-100 text-red-800' :
                                claim.combinedScore >= 70 ? 'bg-orange-100 text-orange-800' :
                                claim.combinedScore >= 60 ? 'bg-yellow-100 text-yellow-800' :
                                claim.combinedScore >= 50 ? 'bg-blue-100 text-blue-800' :
                                'bg-gray-100 text-gray-600'
                              }`}>
                                Quality: {claim.combinedScore}
                              </div>
                              <div className="flex gap-2 text-xs">
                                <div className="text-gray-500" title="Importance Score">
                                  I: {claim.importanceScore}
                                </div>
                                <div className="text-gray-500" title="Checkability Score">
                                  C: {claim.checkabilityScore}
                                </div>
                                <div className={`font-medium ${
                                  claim.truthProbability >= 80 ? 'text-green-600' :
                                  claim.truthProbability >= 60 ? 'text-blue-600' :
                                  claim.truthProbability >= 40 ? 'text-yellow-600' :
                                  claim.truthProbability >= 20 ? 'text-orange-600' :
                                  'text-red-600'
                                }`} title="Truth Probability">
                                  T: {claim.truthProbability}%
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* High priority claims with full details */}
            {highPriorityClaims.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">
                  High Priority Claims (Quality Score ≥ 70)
                </h3>
                {highPriorityClaims.map((claim: any, i: number) => (
                  <div key={i} className="rounded-lg border border-gray-200 bg-gray-50 p-6">
                    <div className="mb-4">
                      <div className="mb-2 flex items-start justify-between">
                        <h4 className="text-lg font-semibold">
                          Claim {i + 1}
                        </h4>
                        <div className="flex items-center gap-2">
                          <div className={`rounded px-3 py-1 text-sm ${
                            claim.combinedScore >= 80 ? 'bg-red-100 text-red-800' :
                            'bg-orange-100 text-orange-800'
                          }`}>
                            Quality: {claim.combinedScore}
                          </div>
                        </div>
                      </div>
                      <p className="font-medium text-gray-900">
                        {claim.originalText}
                      </p>
                      <p className="mt-2 text-sm text-gray-600">
                        <span className="font-medium">Topic:</span> {claim.topic}
                      </p>
                    </div>

                    <div className="grid gap-4 text-sm">
                      <div className="grid grid-cols-3 gap-4 rounded bg-white p-3">
                        <div>
                          <span className="block font-medium text-gray-600">
                            Importance Score
                          </span>
                          <span className="text-lg font-semibold">
                            {claim.importanceScore}
                          </span>
                          <p className="text-xs text-gray-500 mt-1">
                            How central to the document
                          </p>
                        </div>
                        <div>
                          <span className="block font-medium text-gray-600">
                            Checkability Score
                          </span>
                          <span className="text-lg font-semibold">
                            {claim.checkabilityScore}
                          </span>
                          <p className="text-xs text-gray-500 mt-1">
                            How easily verifiable
                          </p>
                        </div>
                        <div>
                          <span className="block font-medium text-gray-600">
                            Truth Probability
                          </span>
                          <span className={`text-lg font-semibold ${
                            claim.truthProbability >= 80 ? 'text-green-600' :
                            claim.truthProbability >= 60 ? 'text-blue-600' :
                            claim.truthProbability >= 40 ? 'text-yellow-600' :
                            claim.truthProbability >= 20 ? 'text-orange-600' :
                            'text-red-600'
                          }`}>
                            {claim.truthProbability}%
                          </span>
                          <p className="text-xs text-gray-500 mt-1">
                            Estimated accuracy
                          </p>
                        </div>
                      </div>

                      {claim.truthProbability <= 50 && (
                        <div className="rounded border bg-yellow-50 p-3">
                          <span className="font-medium text-yellow-800">
                            ⚠️ Verification Recommended
                          </span>
                          <p className="mt-1 text-sm text-yellow-700">
                            {claim.truthProbability <= 30 
                              ? "This claim appears likely false and should be fact-checked immediately."
                              : claim.truthProbability <= 40
                              ? "This claim has low confidence and should be verified."
                              : "This claim is uncertain and would benefit from verification."
                            }
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Questionable claims alert */}
            {questionableClaims.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-orange-800">
                  ⚠️ Claims Requiring Verification ({questionableClaims.length})
                </h3>
                <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
                  <p className="text-sm text-orange-800 mb-3">
                    These claims have low truth probability (≤40%) and should be fact-checked:
                  </p>
                  <ul className="space-y-2">
                    {questionableClaims.map((claim: any, i: number) => (
                      <li key={i} className="text-sm">
                        <div className="flex items-start gap-2">
                          <span className={`inline-block w-2 h-2 rounded-full mt-2 ${
                            claim.truthProbability <= 30 ? 'bg-red-500' : 'bg-orange-500'
                          }`}></span>
                          <div className="flex-1">
                            <p className="text-gray-900">{claim.originalText}</p>
                            <p className="text-xs text-gray-600 mt-1">
                              Truth probability: {claim.truthProbability}% | Topic: {claim.topic}
                            </p>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Summary insights */}
            {typedResult.summary && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-6">
                <h3 className="text-lg font-semibold mb-3">Analysis Summary</h3>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="block font-medium text-blue-700">Total Found</span>
                    <span className="text-xl font-semibold text-blue-900">{typedResult.summary.totalFound}</span>
                  </div>
                  <div>
                    <span className="block font-medium text-blue-700">Above Threshold</span>
                    <span className="text-xl font-semibold text-blue-900">{typedResult.summary.aboveThreshold}</span>
                  </div>
                  <div>
                    <span className="block font-medium text-blue-700">Average Quality</span>
                    <span className="text-xl font-semibold text-blue-900">{typedResult.summary.averageQuality}</span>
                  </div>
                </div>
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