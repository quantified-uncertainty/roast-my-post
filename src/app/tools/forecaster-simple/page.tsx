'use client';

import React from 'react';
import { ToolPageTemplate } from '@/components/tools/form-generators';
import { forecasterTool } from '@/tools/forecaster';

export default function ForecasterAutoPage() {
  return (
    <ToolPageTemplate
      tool={forecasterTool}
      formConfig={{
        fieldOrder: ['question', 'context', 'numForecasts', 'usePerplexity'],
        fieldConfigs: {
          question: {
            label: 'Forecasting Question',
            placeholder: 'What would you like to forecast?',
            helpText: 'A clear, specific question about a future event or outcome'
          },
          context: {
            label: 'Additional Context',
            placeholder: 'Provide any relevant background information...',
            helpText: 'Optional context to help improve the forecast accuracy',
            rows: 4
          },
          numForecasts: {
            label: 'Number of Forecasts',
            helpText: 'How many independent forecasts to generate (3-20)',
            min: 3,
            max: 20,
            step: 1
          },
          usePerplexity: {
            label: 'Use Perplexity Research',
            helpText: 'Enable web research for more informed forecasts (adds ~$0.01 cost)'
          }
        },
        submitButtonText: 'Generate Forecasts',
        submitButtonColor: 'blue',
        examples: [
          {
            name: 'Interest Rate Forecast',
            description: 'Economic prediction with context',
            data: {
              question: 'Will the Federal Reserve raise interest rates by more than 0.5% in 2025?',
              context: 'Current inflation is at 3.2%, unemployment at 4.1%, and the Fed has signaled a cautious approach.',
              numForecasts: 6,
              usePerplexity: true
            }
          },
          {
            name: 'Technology Prediction',
            description: 'Simple tech forecast',
            data: {
              question: 'Will OpenAI release GPT-5 before July 2025?',
              numForecasts: 8,
              usePerplexity: false
            }
          },
          {
            name: 'Sports Outcome',
            data: {
              question: 'Will the Lakers make the NBA playoffs in the 2024-25 season?',
              context: 'Current record: 15-12, LeBron James is healthy, Anthony Davis averaging 28 PPG',
              numForecasts: 5,
              usePerplexity: false
            }
          }
        ]
      }}
      renderResults={(result) => {
        const typedResult = result as any;
        
        return (
          <div className="space-y-6">
            {/* Main forecast result */}
            <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
              <h2 className="text-xl font-semibold mb-2">Forecast Result</h2>
              <div className="text-3xl font-bold text-blue-900">
                {typedResult.probability.toFixed(1)}%
              </div>
              <p className="text-sm text-blue-700 mt-1">
                Aggregated probability from {typedResult.individualForecasts.length} independent forecasts
              </p>
            </div>

            {/* Individual forecasts */}
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold mb-4">Individual Forecasts</h3>
              <div className="space-y-3">
                {typedResult.individualForecasts.map((forecast: any, i: number) => (
                  <div key={i} className="border-l-4 border-gray-300 pl-4">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-medium">Forecast {i + 1}</span>
                      <span className="text-lg font-semibold">{forecast.probability.toFixed(1)}%</span>
                    </div>
                    <p className="text-sm text-gray-600">{forecast.reasoning}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Analysis summary */}
            {typedResult.analysis && (
              <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                <h3 className="text-lg font-semibold mb-2">Analysis Summary</h3>
                <p className="text-gray-700 whitespace-pre-wrap">{typedResult.analysis}</p>
              </div>
            )}

            {/* Research results if Perplexity was used */}
            {(() => {
              // Find Perplexity research interaction in LLM interactions
              const perplexityInteraction = typedResult.llmInteractions?.find((interaction: any) => 
                interaction.tool === 'perplexity-research' || 
                interaction.model?.includes('perplexity') ||
                interaction.response?.summary
              );
              
              if (perplexityInteraction?.response) {
                const research = perplexityInteraction.response;
                return (
                  <div className="bg-purple-50 p-6 rounded-lg border border-purple-200">
                    <h3 className="text-lg font-semibold mb-2">🔍 Research Summary</h3>
                    {research.summary && (
                      <div className="mb-4">
                        <h4 className="font-medium mb-2">Summary:</h4>
                        <p className="text-gray-700">{research.summary}</p>
                      </div>
                    )}
                    {research.keyFindings && research.keyFindings.length > 0 && (
                      <div className="mb-4">
                        <h4 className="font-medium mb-2">Key Findings:</h4>
                        <ul className="list-disc list-inside space-y-1 text-gray-700">
                          {research.keyFindings.map((finding: string, i: number) => (
                            <li key={i}>{finding}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {research.forecastingContext && (
                      <div>
                        <h4 className="font-medium mb-2">Forecasting Context:</h4>
                        <p className="text-gray-700 whitespace-pre-wrap">{research.forecastingContext}</p>
                      </div>
                    )}
                  </div>
                );
              }
              return null;
            })()}
          </div>
        );
      }}
    />
  );
}