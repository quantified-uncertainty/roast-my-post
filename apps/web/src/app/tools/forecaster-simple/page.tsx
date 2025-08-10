'use client';

import { ChartBarIcon } from '@heroicons/react/24/outline';
import { GenericToolPage } from '../components/GenericToolPage';
import { ForecastResultDisplay } from '../components/results/ForecastResultDisplay';
import { getToolExamples } from '../utils/exampleTexts';

interface ForecastInput {
  question: string;
  context: string;
  numForecasts: number;
  usePerplexity: boolean;
}

interface ForecastResult {
  question: string;
  probability: number;
  description: string;
  reasoning?: string;
  consensus: 'low' | 'medium' | 'high';
  individualForecasts: Array<{
    probability: number;
    reasoning: string;
  }>;
  statistics: {
    mean: number;
    median: number;
    stdDev: number;
    min: number;
    max: number;
  };
}

export default function ForecasterSimplePage() {
  const exampleQuestion = getToolExamples('forecaster-simple') as string;

  const renderResult = (result: ForecastResult) => {
    return <ForecastResultDisplay result={result} />;
  };

  return (
    <GenericToolPage<ForecastInput, ForecastResult>
      toolId={'forecaster' as keyof typeof import('@roast/ai').toolSchemas}
      title="Simple Forecaster"
      description="Make probabilistic forecasts about future events using ensemble reasoning"
      icon={<ChartBarIcon className="h-8 w-8 text-purple-600" />}
      fields={[
        {
          type: 'textarea',
          name: 'question',
          label: 'Forecasting Question',
          placeholder: 'Enter a yes/no question about a future event...',
          rows: 3,
          required: true,
          examples: [exampleQuestion],
          helperText: 'Ask a clear yes/no question about a specific future event'
        },
        {
          type: 'textarea',
          name: 'context',
          label: 'Additional Context',
          placeholder: 'Provide any relevant background information or constraints...',
          rows: 3,
          required: false,
          helperText: 'Optional: Add context to improve forecast accuracy'
        },
        {
          type: 'number',
          name: 'numForecasts',
          label: 'Number of Forecasts',
          defaultValue: 3,
          min: 1,
          max: 10,
          helperText: 'How many independent forecasts to generate and aggregate'
        },
        {
          type: 'checkbox',
          name: 'usePerplexity',
          label: 'Use web search for recent information',
          defaultValue: false
        }
      ]}
      renderResult={renderResult}
      submitButtonText="Generate Forecast"
      loadingText="Generating Forecasts..."
      validateInput={(input) => {
        if (!input.question.trim()) return 'Please enter a forecasting question';
        if (input.question.length < 10) return 'Question must be at least 10 characters';
        return true;
      }}
      warning="Forecasts are probabilistic estimates based on available information and should not be taken as definitive predictions."
    />
  );
}