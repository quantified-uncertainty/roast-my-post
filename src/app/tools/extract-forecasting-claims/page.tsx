'use client';

import React from 'react';
import { ToolPageTemplate } from '@/components/tools/form-generators';
import { extractForecastingClaimsTool } from '@/tools/extract-forecasting-claims';

export default function ExtractForecastingClaimsAutoPage() {
  return (
    <ToolPageTemplate
      tool={extractForecastingClaimsTool}
      formConfig={{
        fieldOrder: ['text', 'agentInstructions', 'maxDetailedAnalysis'],
        fieldConfigs: {
          text: {
            label: 'Text to Analyze',
            placeholder: 'Paste text containing predictions, forecasts, or future-oriented claims...',
            helpText: 'The tool will extract and analyze forecasting claims from this text',
            rows: 10
          },
          agentInstructions: {
            label: 'Analysis Instructions',
            placeholder: 'Optional: Specify what types of forecasts to prioritize...',
            helpText: 'Guide the analysis focus (e.g., "Focus on financial predictions" or "Prioritize technology forecasts")',
            rows: 3
          },
          maxDetailedAnalysis: {
            label: 'Number of Detailed Analyses',
            helpText: 'How many forecasts to analyze in detail (1-10)',
            min: 1,
            max: 10,
            step: 1
          }
        },
        submitButtonText: 'Extract Forecasts',
        submitButtonColor: 'blue',
        examples: [
          {
            name: 'Business Strategy Document',
            description: 'Corporate predictions and market forecasts',
            data: {
              text: `Our strategic outlook for the next five years is highly optimistic. We expect revenue to grow by 15-20% annually, driven by expansion into Asian markets. The cloud services division will likely become our largest revenue generator by 2026, surpassing traditional software licenses.

Market consolidation is inevitable - we predict that 3-4 major players will control 80% of the market by 2027. AI integration will be table stakes by 2025, and companies without robust AI capabilities will struggle to compete.

Our R&D investments will increase to 25% of revenue by 2025, up from the current 18%. We anticipate launching at least 5 major product innovations in the next 24 months. The enterprise segment will grow faster than SMB, with enterprise contracts expected to reach $500M by fiscal 2026.`,
              agentInstructions: 'Focus on specific numerical predictions and timeline-based forecasts',
              maxDetailedAnalysis: 5
            }
          },
          {
            name: 'Technology Trends Report',
            description: 'Tech industry predictions',
            data: {
              text: `Quantum computing will reach practical applications by 2028, with financial services being the first major adopters. We expect at least one major breakthrough in room-temperature superconductors before 2030.

Autonomous vehicles will achieve Level 5 autonomy in controlled environments by 2026, though widespread adoption won't occur until 2030 due to regulatory challenges. Electric vehicles will constitute 40% of new car sales by 2027.

The metaverse hype will fade by 2025, but AR glasses will see mainstream adoption by 2028. AI will automate 30% of current white-collar tasks by 2030.`,
              agentInstructions: 'Prioritize technology adoption timelines and market penetration forecasts',
              maxDetailedAnalysis: 4
            }
          },
          {
            name: 'Economic Forecast',
            data: {
              text: `The Federal Reserve will likely cut interest rates by 75-100 basis points in 2025. Inflation will stabilize around 2.5% by mid-2025. Unemployment may rise slightly to 4.2% as the economy cools.

GDP growth will moderate to 2.0-2.5% annually through 2026. The housing market will see a correction of 10-15% in major metropolitan areas by late 2025.`,
              maxDetailedAnalysis: 3
            }
          }
        ]
      }}
      renderResults={(result) => {
        const typedResult = result as any;
        
        return (
          <div className="space-y-6">
            {/* Summary */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <p className="text-blue-900">
                Extracted <span className="font-semibold">{typedResult.totalForecasts}</span> forecasting claims.
                {typedResult.selectedForecasts && (
                  <span> Selected {typedResult.selectedForecasts.length} for detailed analysis.</span>
                )}
              </p>
            </div>

            {/* Categorized forecasts */}
            {typedResult.categorizedForecasts && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Forecasts by Category</h3>
                {Object.entries(typedResult.categorizedForecasts).map(([category, forecasts]: [string, any]) => (
                  <div key={category} className="bg-white p-4 rounded-lg border border-gray-200">
                    <h4 className="font-medium mb-2 capitalize">{category}</h4>
                    <ul className="space-y-2">
                      {(forecasts as any[]).map((forecast: string, i: number) => (
                        <li key={i} className="text-sm text-gray-700">• {forecast}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}

            {/* Detailed analyses */}
            {typedResult.selectedForecasts && typedResult.selectedForecasts.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Detailed Forecast Analyses</h3>
                {typedResult.selectedForecasts.map((forecast: any, i: number) => (
                  <div key={i} className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                    <div className="mb-4">
                      <h4 className="font-semibold text-lg mb-2">Forecast {i + 1}</h4>
                      <p className="font-medium text-gray-900">{forecast.claim}</p>
                    </div>
                    
                    <div className="grid gap-4 text-sm">
                      {forecast.timeframe && (
                        <div>
                          <span className="font-medium text-gray-600">Timeframe:</span>
                          <span className="ml-2">{forecast.timeframe}</span>
                        </div>
                      )}
                      
                      {forecast.confidence && (
                        <div>
                          <span className="font-medium text-gray-600">Confidence Level:</span>
                          <span className="ml-2">{forecast.confidence}</span>
                        </div>
                      )}
                      
                      {forecast.category && (
                        <div>
                          <span className="font-medium text-gray-600">Category:</span>
                          <span className="ml-2 capitalize">{forecast.category}</span>
                        </div>
                      )}
                      
                      {forecast.specificity && (
                        <div>
                          <span className="font-medium text-gray-600">Specificity:</span>
                          <span className="ml-2">{forecast.specificity}/10</span>
                        </div>
                      )}
                      
                      {forecast.verifiability && (
                        <div>
                          <span className="font-medium text-gray-600">Verifiability:</span>
                          <span className="ml-2">{forecast.verifiability}</span>
                        </div>
                      )}
                      
                      {forecast.assumptions && forecast.assumptions.length > 0 && (
                        <div>
                          <span className="font-medium text-gray-600">Key Assumptions:</span>
                          <ul className="mt-1 ml-2 space-y-1">
                            {forecast.assumptions.map((assumption: string, idx: number) => (
                              <li key={idx}>• {assumption}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {forecast.implications && (
                        <div>
                          <span className="font-medium text-gray-600">Implications:</span>
                          <p className="mt-1">{forecast.implications}</p>
                        </div>
                      )}
                      
                      {forecast.reasoning && (
                        <div>
                          <span className="font-medium text-gray-600">Analysis:</span>
                          <p className="mt-1">{forecast.reasoning}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Key insights */}
            {typedResult.keyInsights && typedResult.keyInsights.length > 0 && (
              <div className="bg-indigo-50 p-6 rounded-lg border border-indigo-200">
                <h3 className="text-lg font-semibold mb-3">Key Insights</h3>
                <ul className="space-y-2">
                  {typedResult.keyInsights.map((insight: string, i: number) => (
                    <li key={i} className="text-sm">• {insight}</li>
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