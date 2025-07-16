'use client';

import React from 'react';
import { ToolPageTemplate } from '@/components/tools/form-generators';
import { perplexityResearchTool } from '@/tools/perplexity-research';

export default function PerplexityResearchAutoPage() {
  return (
    <ToolPageTemplate
      tool={perplexityResearchTool}
      formConfig={{
        fieldOrder: ['query', 'focusArea', 'maxSources', 'includeForecastingContext'],
        fieldConfigs: {
          query: {
            label: 'Research Query',
            placeholder: 'What would you like to research?',
            helpText: 'Enter your research question or topic',
            rows: 2
          },
          focusArea: {
            label: 'Focus Area',
            helpText: 'Choose the type of sources to prioritize'
          },
          maxSources: {
            label: 'Maximum Sources',
            helpText: 'Number of sources to include in research (1-10)',
            min: 1,
            max: 10,
            step: 1
          },
          includeForecastingContext: {
            label: 'Include Forecasting Context',
            helpText: 'Add specific context for making predictions based on the research'
          }
        },
        submitButtonText: 'Research Topic',
        submitButtonColor: 'purple',
        examples: [
          {
            name: 'Technology Research',
            description: 'Latest tech developments',
            data: {
              query: 'Latest developments in quantum computing industry 2024',
              focusArea: 'technical',
              maxSources: 8,
              includeForecastingContext: false
            }
          },
          {
            name: 'Market Analysis',
            description: 'Financial market research',
            data: {
              query: 'Electric vehicle market share trends and major players 2024',
              focusArea: 'market',
              maxSources: 6,
              includeForecastingContext: true
            }
          },
          {
            name: 'Academic Research',
            description: 'Scientific findings',
            data: {
              query: 'Recent breakthroughs in CRISPR gene editing applications',
              focusArea: 'academic',
              maxSources: 10,
              includeForecastingContext: false
            }
          },
          {
            name: 'News Research',
            data: {
              query: 'Latest regulatory changes for cryptocurrency in the United States',
              focusArea: 'news',
              maxSources: 5,
              includeForecastingContext: true
            }
          }
        ]
      }}
      renderResults={(result) => {
        const typedResult = result as any;
        
        return (
          <div className="space-y-6">
            {/* Summary */}
            <div className="bg-purple-50 p-6 rounded-lg border border-purple-200">
              <h2 className="text-xl font-semibold mb-3">Research Summary</h2>
              <p className="text-gray-700 whitespace-pre-wrap">{typedResult.summary}</p>
            </div>

            {/* Key findings */}
            {typedResult.keyFindings && typedResult.keyFindings.length > 0 && (
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <h3 className="text-lg font-semibold mb-3">Key Findings</h3>
                <ul className="space-y-2">
                  {typedResult.keyFindings.map((finding: string, i: number) => (
                    <li key={i} className="flex">
                      <span className="text-purple-600 mr-2">•</span>
                      <span className="text-gray-700">{finding}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Sources */}
            {typedResult.sources && typedResult.sources.length > 0 && (
              <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                <h3 className="text-lg font-semibold mb-3">Sources</h3>
                <div className="space-y-3">
                  {typedResult.sources.map((source: any, i: number) => (
                    <div key={i} className="bg-white p-3 rounded border border-gray-200">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-sm">{source.title || `Source ${i + 1}`}</h4>
                          {source.url && (
                            <a 
                              href={source.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:underline break-all"
                            >
                              {source.url}
                            </a>
                          )}
                          {source.date && (
                            <p className="text-xs text-gray-500 mt-1">Published: {source.date}</p>
                          )}
                        </div>
                        {source.relevance && (
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded ml-2">
                            {source.relevance}% relevant
                          </span>
                        )}
                      </div>
                      {source.summary && (
                        <p className="text-sm text-gray-600 mt-2">{source.summary}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Forecasting context */}
            {typedResult.forecastingContext && (
              <div className="bg-indigo-50 p-6 rounded-lg border border-indigo-200">
                <h3 className="text-lg font-semibold mb-3">Forecasting Context</h3>
                <div className="space-y-3 text-sm">
                  {typedResult.forecastingContext.basedOnResearch && (
                    <div>
                      <h4 className="font-medium mb-1">Based on Research:</h4>
                      <p className="text-gray-700">{typedResult.forecastingContext.basedOnResearch}</p>
                    </div>
                  )}
                  {typedResult.forecastingContext.trends && typedResult.forecastingContext.trends.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-1">Key Trends:</h4>
                      <ul className="space-y-1">
                        {typedResult.forecastingContext.trends.map((trend: string, i: number) => (
                          <li key={i} className="text-gray-700">• {trend}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {typedResult.forecastingContext.uncertainties && typedResult.forecastingContext.uncertainties.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-1">Uncertainties:</h4>
                      <ul className="space-y-1">
                        {typedResult.forecastingContext.uncertainties.map((uncertainty: string, i: number) => (
                          <li key={i} className="text-gray-700">• {uncertainty}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {typedResult.forecastingContext.suggestedQuestions && typedResult.forecastingContext.suggestedQuestions.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-1">Suggested Forecast Questions:</h4>
                      <ul className="space-y-1">
                        {typedResult.forecastingContext.suggestedQuestions.map((question: string, i: number) => (
                          <li key={i} className="text-gray-700">• {question}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Additional insights */}
            {typedResult.additionalInsights && (
              <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                <h3 className="text-lg font-semibold mb-3">Additional Insights</h3>
                <p className="text-gray-700 whitespace-pre-wrap">{typedResult.additionalInsights}</p>
              </div>
            )}
          </div>
        );
      }}
    />
  );
}