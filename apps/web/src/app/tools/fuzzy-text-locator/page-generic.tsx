'use client';

import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { GenericToolPage } from '../components/GenericToolPage';

interface FuzzyMatch {
  matchedText: string;
  lineNumber: number;
  charOffset: number;
  confidence: number;
  context: {
    before?: string;
    after?: string;
  };
  explanation?: string;
}

interface FuzzyTextLocatorOutput {
  found: boolean;
  matches: FuzzyMatch[];
  metadata?: {
    searchStrategy?: string;
    processingTime?: number;
  };
}

/**
 * Example of using GenericToolPage for the fuzzy-text-locator tool
 * 
 * Before: ~180 lines
 * After: ~80 lines (55% reduction)
 */
export default function FuzzyTextLocatorPageGeneric() {
  const renderResult = (result: FuzzyTextLocatorOutput) => (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-lg font-medium text-gray-900 mb-4">
        {result.found ? `Found ${result.matches.length} Match${result.matches.length !== 1 ? 'es' : ''}` : 'No Matches Found'}
      </h2>
      
      {result.found && result.matches.length > 0 ? (
        <div className="space-y-4">
          {result.matches.map((match, index) => (
            <div key={index} className="border rounded-lg p-4 bg-gray-50">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Match {index + 1}</span>
                  <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded">
                    {Math.round(match.confidence * 100)}% confidence
                  </span>
                </div>
                <span className="text-xs text-gray-500">
                  Line {match.lineNumber}, Position {match.charOffset}
                </span>
              </div>
              
              <div className="bg-white p-3 rounded border">
                <p className="text-sm font-mono whitespace-pre-wrap">
                  {match.context.before && (
                    <span className="text-gray-500">{match.context.before}</span>
                  )}
                  <mark className="bg-yellow-200 font-semibold">{match.matchedText}</mark>
                  {match.context.after && (
                    <span className="text-gray-500">{match.context.after}</span>
                  )}
                </p>
              </div>
              
              {match.explanation && (
                <p className="text-xs text-gray-600 mt-2 italic">{match.explanation}</p>
              )}
            </div>
          ))}
          
          {result.metadata && (
            <div className="mt-4 p-3 bg-blue-50 rounded">
              <p className="text-sm text-blue-900">
                <strong>Search Strategy:</strong> {result.metadata.searchStrategy}
              </p>
              {result.metadata.processingTime && (
                <p className="text-xs text-blue-700 mt-1">
                  Processing time: {result.metadata.processingTime}ms
                </p>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <p>No matches found for the search text.</p>
          <p className="text-sm mt-2">Try adjusting your search or using more general terms.</p>
        </div>
      )}
    </div>
  );

  return (
    <GenericToolPage<
      { document: string; searchText: string; fuzzyThreshold?: number },
      FuzzyTextLocatorOutput
    >
      toolId="fuzzy-text-locator"
      title="Fuzzy Text Locator"
      description="Find approximate text matches in documents with intelligent fuzzy matching"
      icon={<MagnifyingGlassIcon className="h-8 w-8 text-indigo-600" />}
      fields={[
        {
          type: 'textarea',
          name: 'document',
          label: 'Document Text',
          placeholder: 'Enter or paste the document text to search within...',
          rows: 8,
          required: true
        },
        {
          type: 'textarea',
          name: 'searchText',
          label: 'Search Text',
          placeholder: 'Enter the text you want to find (exact or approximate)...',
          rows: 3,
          required: true,
          helperText: 'The tool will find both exact and fuzzy matches'
        },
        {
          type: 'number',
          name: 'fuzzyThreshold',
          label: 'Fuzzy Match Threshold',
          defaultValue: 0.8,
          min: 0,
          max: 1,
          step: 0.1,
          helperText: 'Higher values require closer matches (0.8 = 80% similarity)'
        }
      ]}
      renderResult={renderResult}
      exampleInput={{
        document: `The quick brown fox jumps over the lazy dog.
A fast auburn fox leaps above a sleepy canine.
The speedy red fox hops over the tired hound.`,
        searchText: 'quick brown fox'
      }}
      exampleText="Load example with variations"
      submitButtonText="Find Matches"
      loadingText="Searching..."
      validateInput={(input) => {
        if (!input.document.trim()) return 'Please enter a document to search';
        if (!input.searchText.trim()) return 'Please enter text to search for';
        if (input.document.length < input.searchText.length) {
          return 'Search text cannot be longer than the document';
        }
        return true;
      }}
    />
  );
}