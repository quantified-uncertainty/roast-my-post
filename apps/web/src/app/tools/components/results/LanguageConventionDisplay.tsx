import React from 'react';
import { getConventionColor } from '../../utils/resultFormatting';

interface LanguageConventionResult {
  convention: 'US' | 'UK';
  confidence: number;
  consistency: number;
  evidence: Array<{
    word: string;
    convention: 'US' | 'UK';
    count: number;
  }>;
  documentType?: {
    type: 'academic' | 'technical' | 'blog' | 'casual' | 'unknown';
    confidence: number;
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
            {result.convention === 'US' ? '🇺🇸 US English' : '🇬🇧 UK English'}
          </p>
          <div className="text-sm text-right">
            <div>Confidence: {Math.round(result.confidence * 100)}%</div>
            <div>Consistency: {Math.round(result.consistency * 100)}%</div>
          </div>
        </div>
        
        {result.documentType && (
          <p className="text-sm mb-4">
            Document type: <span className="font-medium capitalize">{result.documentType.type}</span> 
            {' '}({Math.round(result.documentType.confidence * 100)}% confidence)
          </p>
        )}
        
        {result.evidence && result.evidence.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-sm font-medium">Evidence found:</p>
            <div className="grid grid-cols-2 gap-2">
              {result.evidence.map((item, index) => (
                <div key={index} className="text-sm bg-gray-50 p-2 rounded">
                  <span className="font-medium">{item.word}</span>
                  <span className="text-gray-600 ml-2">
                    ({item.convention === 'US' ? '🇺🇸' : '🇬🇧'} × {item.count})
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}