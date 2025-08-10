import React from 'react';
import { CheckCircleIcon } from '@heroicons/react/24/outline';
import type { CheckSpellingGrammarOutput } from '@roast/ai';
import { severityConfig } from '../../utils/resultFormatting';

interface SpellingGrammarDisplayProps {
  result: CheckSpellingGrammarOutput;
  className?: string;
}

export function SpellingGrammarDisplay({ result, className = '' }: SpellingGrammarDisplayProps) {
  const hasErrors = result.errors && result.errors.length > 0;
  
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Analysis Summary */}
      {result.metadata && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Analysis Summary</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Total Errors:</span>
              <span className="text-sm font-medium">{result.metadata.totalErrorsFound}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Convention:</span>
              <span className="text-sm font-medium">{result.metadata.convention}</span>
            </div>
            {result.metadata.processingTime && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Processing Time:</span>
                <span className="text-sm font-medium">{result.metadata.processingTime}ms</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Errors or Success */}
      {hasErrors ? (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Errors Found</h2>
          <div className="space-y-4">
            {result.errors.map((error, index) => {
              const severity = error.importance > 70 ? 'critical' : error.importance > 40 ? 'major' : 'minor';
              const config = severityConfig[severity];
              const Icon = config.icon;
              
              return (
                <div key={index} className={`p-4 rounded-lg ${config.bgColor} border-l-4 ${config.borderColor}`}>
                  <div className="flex items-start">
                    <Icon className={`h-5 w-5 ${config.color} mt-0.5 mr-3 flex-shrink-0`} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-sm font-medium ${config.color}`}>
                          {error.type === 'spelling' ? 'Spelling' : 'Grammar'} Error
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-full ${config.bgColor} ${config.color}`}>
                          {severity}
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-700 mb-2">
                        <strong>Found:</strong> "{error.text}"
                      </p>
                      
                      {error.correction && (
                        <p className="text-sm text-gray-700 mb-2">
                          <strong>Suggestion:</strong> "{error.correction}"
                        </p>
                      )}
                      
                      {error.description && (
                        <p className="text-sm text-gray-600 italic">{error.description}</p>
                      )}
                      
                      {error.lineNumber && (
                        <p className="text-xs text-gray-500 mt-2">
                          Line: {error.lineNumber}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-center">
            <CheckCircleIcon className="h-6 w-6 text-green-600 mr-3" />
            <div>
              <h3 className="text-lg font-medium text-green-900">No Errors Found</h3>
              <p className="text-sm text-green-700 mt-1">
                Your text appears to be free of spelling and grammar errors.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}