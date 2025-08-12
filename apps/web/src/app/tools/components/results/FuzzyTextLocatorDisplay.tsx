import React from 'react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import type { TextLocationFinderOutput } from '@roast/ai';

interface FuzzyTextLocatorDisplayProps {
  result: TextLocationFinderOutput;
  className?: string;
}

export function FuzzyTextLocatorDisplay({ result, className = '' }: FuzzyTextLocatorDisplayProps) {
  return (
    <div className={`bg-white shadow rounded-lg p-6 ${className}`}>
      <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
        <MagnifyingGlassIcon className="h-5 w-5 mr-2" />
        Search Result
      </h2>
      
      {result.found ? (
        <div className="space-y-4">
          <div className="flex items-center text-green-600">
            <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="font-medium">Text found successfully</span>
          </div>
          
          {result.location && (
            <div className="bg-gray-50 p-4 rounded-lg space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Start Position</p>
                  <p className="mt-1 text-sm font-medium text-gray-900">{result.location.startOffset}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">End Position</p>
                  <p className="mt-1 text-sm font-medium text-gray-900">{result.location.endOffset}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Confidence</p>
                  <p className="mt-1 text-sm font-medium text-gray-900">
                    {Math.round((result.location.confidence || 0) * 100)}%
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Strategy</p>
                  <p className="mt-1 text-sm font-medium text-gray-900">
                    {result.location.strategy || 'N/A'}
                  </p>
                </div>
              </div>
              
              <div className="pt-3 border-t border-gray-200">
                <p className="text-sm font-medium text-gray-700 mb-2">Found text:</p>
                <div className="bg-white p-3 rounded border border-gray-300">
                  <code className="text-sm text-gray-800 font-mono">
                    {result.location.quotedText}
                  </code>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center text-red-600">
            <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span className="font-medium">Text not found</span>
          </div>
          
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
            <p className="text-sm text-yellow-800">
              The search text could not be located in the document. Try:
            </p>
            <ul className="mt-2 text-sm text-yellow-700 list-disc list-inside space-y-1">
              <li>Checking for typos in the search text</li>
              <li>Using a shorter or more specific search phrase</li>
              <li>Searching for a partial match instead of the full text</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}