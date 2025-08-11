'use client';

import { ChartBarIcon } from '@heroicons/react/24/solid';
import { extractForecastingClaimsTool } from '@roast/ai';
import { GenericToolPage } from '../components/GenericToolPage';
import { getScoreColor, getScoreIcon } from '../utils/resultFormatting';
import { examples } from './examples';

interface ForecastResult {
  forecasts: Array<{
    originalText: string;
    rewrittenPredictionText?: string;
    precisionScore?: number;
    verifiabilityScore?: number;
    importanceScore?: number;
    robustnessScore?: number;
    resolutionDate?: string;
    authorProbability?: number;
  }>;
}

export default function ExtractForecastingClaimsPage() {

  const renderResult = (result: ForecastResult) => {
    if (!result.forecasts) return null;
    
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-medium text-gray-900">
          {result.forecasts.length} Forecasts Found
        </h2>
        {result.forecasts.map((forecast, index) => (
          <div key={index} className="bg-white shadow rounded-lg p-6">
            <p className="text-gray-900 mb-4">{forecast.originalText}</p>
            
            {forecast.rewrittenPredictionText && (
              <div className="bg-blue-50 rounded p-3 mb-4">
                <p className="text-sm text-blue-900">
                  <strong>Clarified:</strong> {forecast.rewrittenPredictionText}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {['precisionScore', 'verifiabilityScore', 'importanceScore', 'robustnessScore'].map((scoreType) => {
                const score = forecast[scoreType as keyof typeof forecast] as number | undefined;
                if (score === undefined) return null;
                const Icon = getScoreIcon(score);
                return (
                  <div key={scoreType} className="text-center">
                    <Icon className={`h-6 w-6 mx-auto mb-1 ${getScoreColor(score)}`} />
                    <p className="text-xs text-gray-500">{scoreType.replace('Score', '')}</p>
                    <p className={`text-lg font-semibold ${getScoreColor(score)}`}>{score}</p>
                  </div>
                );
              })}
            </div>

            {(forecast.resolutionDate || forecast.authorProbability) && (
              <div className="mt-4 flex flex-wrap gap-4 text-sm">
                {forecast.resolutionDate && (
                  <span className="text-gray-600">
                    <strong>Resolution:</strong> {forecast.resolutionDate}
                  </span>
                )}
                {forecast.authorProbability && (
                  <span className="text-gray-600">
                    <strong>Probability:</strong> {forecast.authorProbability}%
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };


  return (
    <GenericToolPage<{ text: string }, ForecastResult>
      toolId={extractForecastingClaimsTool.config.id as keyof typeof import('@roast/ai').toolSchemas}
      title={extractForecastingClaimsTool.config.name}
      description={extractForecastingClaimsTool.config.description}
      icon={<ChartBarIcon className="h-8 w-8 text-purple-600" />}
      fields={[
        {
          type: 'textarea',
          name: 'text',
          label: 'Text with Predictions',
          placeholder: 'Enter text containing predictions or forecasts...',
          rows: 10,
          required: true,
          examples
        }
      ]}
      renderResult={renderResult}
      submitButtonText="Extract Forecasts"
      loadingText="Extracting Forecasts..."
      validateInput={(input) => {
        if (!input.text.trim()) return 'Please enter some text to analyze';
        return true;
      }}
    />
  );
}
