import React from 'react';
import { formatPercentage, getConsensusColor } from '../../utils/resultFormatting';

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

interface ForecastResultDisplayProps {
  result: ForecastResult;
  className?: string;
}

export function ForecastResultDisplay({ result, className = '' }: ForecastResultDisplayProps) {
  const mainProbability = Math.round(result.probability * 100);
  
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Main Forecast */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-2">Forecast Result</h2>
        <div className="mb-4">
          <p className="text-gray-700 font-medium">{result.question}</p>
        </div>
        
        <div className="flex items-center justify-between mb-4">
          <div className="text-center">
            <p className="text-3xl font-bold text-indigo-600">{mainProbability}%</p>
            <p className="text-sm text-gray-500">Consensus Probability</p>
          </div>
          
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${getConsensusColor(result.consensus)}`}>
            {result.consensus.charAt(0).toUpperCase() + result.consensus.slice(1)} Consensus
          </div>
        </div>
        
        {result.description && (
          <div className="border-t pt-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Summary</h3>
            <p className="text-gray-600">{result.description}</p>
          </div>
        )}
        
        {result.reasoning && (
          <div className="border-t pt-4 mt-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Reasoning</h3>
            <p className="text-gray-600">{result.reasoning}</p>
          </div>
        )}
      </div>

      {/* Statistics */}
      {result.statistics && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Statistical Analysis</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{Math.round(result.statistics.mean)}%</p>
              <p className="text-xs text-gray-500">Mean</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{Math.round(result.statistics.median)}%</p>
              <p className="text-xs text-gray-500">Median</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{Math.round(result.statistics.stdDev)}%</p>
              <p className="text-xs text-gray-500">Std Dev</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{Math.round(result.statistics.min)}%</p>
              <p className="text-xs text-gray-500">Min</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{Math.round(result.statistics.max)}%</p>
              <p className="text-xs text-gray-500">Max</p>
            </div>
          </div>
        </div>
      )}

      {/* Individual Forecasts */}
      {result.individualForecasts && result.individualForecasts.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Individual Forecasts</h3>
          <div className="space-y-4">
            {result.individualForecasts.map((forecast, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Forecast {index + 1}</span>
                  <span className="text-lg font-bold text-indigo-600">
                    {Math.round(forecast.probability * 100)}%
                  </span>
                </div>
                {forecast.reasoning && (
                  <p className="text-sm text-gray-600">{forecast.reasoning}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}