import React from 'react';
import { getConventionColor } from '../../utils/resultFormatting';

interface LanguageConventionResult {
  convention: 'US' | 'UK' | 'UNKNOWN';
  confidence: number;
  reasoning: string;
  indicators: {
    spelling?: string[];
    vocabulary?: string[];
    grammar?: string[];
    punctuation?: string[];
    dateFormat?: string[];
  };
}

interface LanguageConventionDisplayProps {
  result: LanguageConventionResult;
  className?: string;
}

export function LanguageConventionDisplay({ result, className = '' }: LanguageConventionDisplayProps) {
  return (
    <div className={`bg-white shadow rounded-lg p-6 ${className}`}>
      <h2 className="text-lg font-medium text-gray-900 mb-4">Detection Result</h2>
      
      <div className={`p-4 rounded-lg border ${getConventionColor(result.convention)}`}>
        <div className="flex items-center justify-between mb-3">
          <p className="font-semibold text-lg">
            {result.convention === 'US' ? '🇺🇸 US English' : 
             result.convention === 'UK' ? '🇬🇧 UK English' : 
             '❓ Unknown/Mixed'}
          </p>
          <span className="text-sm">
            Confidence: {Math.round(result.confidence * 100)}%
          </span>
        </div>
        
        <p className="text-sm mb-4">{result.reasoning}</p>
        
        {Object.entries(result.indicators).length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-sm font-medium">Indicators found:</p>
            {result.indicators.spelling && result.indicators.spelling.length > 0 && (
              <div className="text-sm">
                <span className="font-medium">Spelling:</span> {result.indicators.spelling.join(', ')}
              </div>
            )}
            {result.indicators.vocabulary && result.indicators.vocabulary.length > 0 && (
              <div className="text-sm">
                <span className="font-medium">Vocabulary:</span> {result.indicators.vocabulary.join(', ')}
              </div>
            )}
            {result.indicators.grammar && result.indicators.grammar.length > 0 && (
              <div className="text-sm">
                <span className="font-medium">Grammar:</span> {result.indicators.grammar.join(', ')}
              </div>
            )}
            {result.indicators.punctuation && result.indicators.punctuation.length > 0 && (
              <div className="text-sm">
                <span className="font-medium">Punctuation:</span> {result.indicators.punctuation.join(', ')}
              </div>
            )}
            {result.indicators.dateFormat && result.indicators.dateFormat.length > 0 && (
              <div className="text-sm">
                <span className="font-medium">Date Format:</span> {result.indicators.dateFormat.join(', ')}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}