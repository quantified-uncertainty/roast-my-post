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
        const selectedForecasts = typedResult.forecasts?.filter((f: any) => f.worthDetailedAnalysis) || [];
        
        return (
          <div className="space-y-6">
            {/* Summary */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <p className="text-blue-900">
                Extracted <span className="font-semibold">{typedResult.totalFound || 0}</span> forecasting claims.
                {selectedForecasts.length > 0 && (
                  <span> Selected {selectedForecasts.length} for detailed analysis.</span>
                )}
              </p>
            </div>

            {/* All forecasts list */}
            {typedResult.forecasts && typedResult.forecasts.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">All Extracted Forecasts</h3>
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <ul className="space-y-3">
                    {typedResult.forecasts.map((forecast: any, i: number) => (
                      <li key={i} className="border-b border-gray-100 pb-2 last:border-b-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="text-sm text-gray-900 font-medium">{forecast.text}</p>
                            <div className="flex gap-4 mt-1 text-xs text-gray-600">
                              <span>Topic: {forecast.topic}</span>
                              {forecast.timeframe && <span>Timeframe: {forecast.timeframe}</span>}
                              {forecast.probability && <span>Probability: {forecast.probability}%</span>}
                            </div>
                          </div>
                          {forecast.worthDetailedAnalysis && (
                            <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                              Selected for analysis
                            </span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Selected forecasts with reasoning */}
            {selectedForecasts.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Selected for Detailed Analysis</h3>
                {selectedForecasts.map((forecast: any, i: number) => (
                  <div key={i} className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                    <div className="mb-4">
                      <h4 className="font-semibold text-lg mb-2">Forecast {i + 1}</h4>
                      <p className="font-medium text-gray-900">{forecast.text}</p>
                    </div>
                    
                    <div className="grid gap-4 text-sm">
                      {forecast.timeframe && (
                        <div>
                          <span className="font-medium text-gray-600">Timeframe:</span>
                          <span className="ml-2">{forecast.timeframe}</span>
                        </div>
                      )}
                      
                      {forecast.probability && (
                        <div>
                          <span className="font-medium text-gray-600">Probability:</span>
                          <span className="ml-2">{forecast.probability}%</span>
                        </div>
                      )}
                      
                      {forecast.topic && (
                        <div>
                          <span className="font-medium text-gray-600">Topic:</span>
                          <span className="ml-2">{forecast.topic}</span>
                        </div>
                      )}
                      
                      {forecast.reasoning && (
                        <div>
                          <span className="font-medium text-gray-600">Selection Reasoning:</span>
                          <p className="mt-1">{forecast.reasoning}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      }}
    />
  );
}