'use client';

import React from 'react';
import { ToolPageTemplate } from '@/components/tools/form-generators';
import textLocationFinderTool from '@/tools/text-location-finder';
import type { TextLocationFinderOutput } from '@/tools/text-location-finder';

// Custom results renderer for the Text Location Finder
function renderResults(result: TextLocationFinderOutput) {
  const getStrategyColor = (strategy: string) => {
    const colors: Record<string, string> = {
      exact: 'bg-green-100 text-green-800',
      caseInsensitive: 'bg-blue-100 text-blue-800',
      normalizedQuotes: 'bg-purple-100 text-purple-800',
      normalizedWhitespace: 'bg-indigo-100 text-indigo-800',
      context: 'bg-orange-100 text-orange-800',
      partialMatch: 'bg-yellow-100 text-yellow-800',
      keyPhrase: 'bg-pink-100 text-pink-800',
      llm: 'bg-red-100 text-red-800'
    };
    return colors[strategy] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <h3 className="font-semibold text-gray-900 mb-3">Search Result</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Status:</span> {result.found ? 'Found' : 'Not Found'}
          </div>
          <div>
            <span className="text-gray-600">Time:</span> {result.processingTimeMs}ms
          </div>
          {result.found && result.location && (
            <>
              <div>
                <span className="text-gray-600">Strategy:</span> {result.location.strategy}
              </div>
              <div>
                <span className="text-gray-600">Confidence:</span> {(result.location.confidence * 100).toFixed(0)}%
              </div>
            </>
          )}
          {result.llmUsed && (
            <div className="col-span-2">
              <span className="text-gray-600">LLM Fallback:</span> <span className="text-orange-600">Used</span>
            </div>
          )}
        </div>
      </div>

      {/* Search Result */}
      <div className="border border-gray-200 rounded-lg p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="font-medium text-gray-900">
            "{result.searchText}"
          </div>
          <div className={`px-2 py-1 rounded text-xs font-medium ${
            result.found ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {result.found ? 'Found' : 'Not Found'}
          </div>
        </div>

        {result.found && result.location && (
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className={`px-2 py-1 rounded text-xs ${getStrategyColor(result.location.strategy)}`}>
                {result.location.strategy}
              </span>
              <span className="text-gray-500">
                Confidence: {(result.location.confidence * 100).toFixed(0)}%
              </span>
            </div>
            <div className="text-gray-600">
              <span className="font-medium">Line {result.location.lineNumber}:</span> "{result.location.lineText}"
            </div>
            <div className="text-gray-600">
              <span className="font-medium">Position:</span> {result.location.startOffset}-{result.location.endOffset}
            </div>
            <div className="bg-gray-50 p-2 rounded text-sm">
              <span className="font-medium">Found text:</span> "{result.location.quotedText}"
            </div>
            {result.llmSuggestion && (
              <div className="bg-orange-50 p-2 rounded text-sm mt-2">
                <span className="font-medium text-orange-800">LLM Explanation:</span> {result.llmSuggestion}
              </div>
            )}
          </div>
        )}

        {result.error && (
          <div className="text-red-600 text-sm">
            <span className="font-medium">Error:</span> {result.error}
          </div>
        )}
      </div>
    </div>
  );
}

export default function TextLocationFinderPage() {
  return (
    <ToolPageTemplate
      tool={textLocationFinderTool}
      renderResults={renderResults}
      formConfig={{
        fieldOrder: ['documentText', 'searchText', 'context', 'options'],
        fieldConfigs: {
          documentText: {
            label: 'Document Text',
            placeholder: 'Paste the document text to search within...',
            helpText: 'The text document where you want to find specific phrases or sentences',
            rows: 8
          },
          searchText: {
            label: 'Search Text',
            placeholder: 'Text to find...',
            helpText: 'The exact text you want to locate in the document'
          },
          context: {
            label: 'Context (Optional)',
            placeholder: 'Surrounding context for better matching...',
            helpText: 'Additional context that might help locate the text more accurately'
          },
          options: {
            label: 'Search Options',
            helpText: 'Simple options for common search needs',
            fieldConfigs: {
              caseInsensitive: {
                label: 'Case Insensitive',
                helpText: 'Ignore case differences when matching (find "AI" when text has "ai")'
              },
              allowPartialMatch: {
                label: 'Allow Partial Matching',
                helpText: 'Allow matching partial text for long or inexact quotes'
              },
              useLLMFallback: {
                label: 'Use LLM Fallback',
                helpText: 'Use AI to find text when other methods fail (for paraphrased, truncated, or similar text)'
              }
            }
          }
        },
        submitButtonText: 'Find Text Location',
        submitButtonColor: 'blue',
        examples: [
          {
            name: 'Basic Exact Search',
            description: 'Find exact text matches in a document',
            data: {
              documentText: 'This is a sample document with some text. It contains multiple sentences and paragraphs.',
              searchText: 'sample document',
              options: {
                caseInsensitive: false,
                allowPartialMatch: false
              }
            }
          },
          {
            name: 'Partial Match with Context',
            description: 'Use partial matching and context for inexact quotes',
            data: {
              documentText: 'The research shows that climate change will impact agriculture by 2030. Scientists predict significant challenges.',
              searchText: 'climate change will cause problems by 2030',
              context: 'research about agriculture and climate',
              options: {
                allowPartialMatch: true
              }
            }
          },
          {
            name: 'Case-Insensitive Search',
            description: 'Handle case differences when matching',
            data: {
              documentText: 'The article mentions "artificial intelligence" and discusses AI development.',
              searchText: 'ARTIFICIAL INTELLIGENCE',
              options: {
                caseInsensitive: true
              }
            }
          },
          {
            name: 'LLM Fallback for Paraphrased Text',
            description: 'Find text that is paraphrased or expressed differently',
            data: {
              documentText: 'Studies indicate that global temperatures may rise by 2-3 degrees Celsius over the next five decades.',
              searchText: 'research shows that worldwide temperatures could increase by 2-3°C in the next 50 years',
              options: {
                useLLMFallback: true
              }
            }
          }
        ]
      }}
    />
  );
}