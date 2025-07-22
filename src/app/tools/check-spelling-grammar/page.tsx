'use client';

import React from 'react';
import { ToolPageTemplate } from '@/components/tools/form-generators';
import { checkSpellingGrammarTool, CheckSpellingGrammarOutput, SpellingGrammarError } from '@/tools/check-spelling-grammar';

export default function CheckSpellingGrammarAutoPage() {
  return (
    <ToolPageTemplate
      tool={checkSpellingGrammarTool}
      formConfig={{
        fieldOrder: ['text', 'context', 'includeStyle', 'maxErrors'],
        fieldConfigs: {
          text: {
            label: 'Text to Check',
            placeholder: 'Paste text to check for spelling, grammar, and style issues...',
            helpText: 'The tool will analyze this text for various types of errors',
            rows: 10
          },
          context: {
            label: 'Document Context',
            placeholder: 'E.g., "Technical documentation", "Blog post", "Academic paper"...',
            helpText: 'Optional context helps tailor suggestions to your document type',
            rows: 2
          },
          includeStyle: {
            label: 'Include Style Suggestions',
            helpText: 'Check for clarity, conciseness, and writing style improvements'
          },
          maxErrors: {
            label: 'Maximum Errors to Return',
            helpText: 'Limit the number of issues reported (1-100)',
            min: 1,
            max: 100,
            step: 1
          }
        },
        submitButtonText: 'Check Writing',
        submitButtonColor: 'blue',
        examples: [
          {
            name: 'Common Grammar Errors',
            description: 'Text with various grammar mistakes',
            data: {
              text: `Their are many reasons why this approch might not work. First of all, we need to understand that its important to have a good understanding of the basic principals.

The team have been working hard on this project for the last 6 months. Between you and I, I think we could of done better if we had more time. The affect of rushing things is that we make alot of mistakes.

Going forward, we should try and be more carefull with our planning. Me and my colleague will take the lead on this. Hopefully we wont make the same mistakes again.`,
              context: 'Business communication',
              includeStyle: true,
              maxErrors: 50
            }
          },
          {
            name: 'Technical Documentation',
            description: 'Technical text with terminology',
            data: {
              text: `The API endpoint accepts a JSON payload containing the users credentials. Make sure to properly authenticate before making any request.

When the server recieves a request, it first validates the input parameters. If validation fails, a 400 error is returned with details about what went wrong.

The response will include a status code and a body containing the requested data. In case of errors, the body will contain an error message explaining the issue.`,
              context: 'API documentation',
              includeStyle: true,
              maxErrors: 30
            }
          },
          {
            name: 'Academic Writing',
            data: {
              text: `This study examines the impact of social media on adolescent mental health. The data was collected from 500 participants over a period of six months.

Our findings suggests that excessive social media use correlates with increased anxiety levels. However, the causal relationship remains unclear and requires further investigation.

Previous research have shown similar results, although the methodologies varied significantly. We believe our approach provides a more comprehensive understanding of the phenomenon.`,
              context: 'Academic research paper',
              includeStyle: true,
              maxErrors: 50
            }
          }
        ]
      }}
      renderResults={(result) => {
        const typedResult = result as CheckSpellingGrammarOutput;
        
        const errorTypeColors = {
          spelling: 'bg-red-100 border-red-300 text-red-900',
          grammar: 'bg-orange-100 border-orange-300 text-orange-900',
          style: 'bg-blue-100 border-blue-300 text-blue-900'
        };
        
        return (
          <div className="space-y-6">
            {/* Summary */}
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <p className="text-green-900">
                Found <span className="font-semibold">{typedResult.errors.length}</span> issues in your text.
              </p>
            </div>

            {/* Statistics */}
            {typedResult.summary && (
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <h3 className="text-lg font-semibold mb-4">Summary Statistics</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Total issues:</span>
                    <span className="ml-2 font-medium">{typedResult.summary.totalErrors}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Spelling errors:</span>
                    <span className="ml-2 font-medium">{typedResult.summary.spellingErrors}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Grammar errors:</span>
                    <span className="ml-2 font-medium">{typedResult.summary.grammarErrors}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Style suggestions:</span>
                    <span className="ml-2 font-medium">{typedResult.summary.styleErrors}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Errors list */}
            {typedResult.errors.length === 0 ? (
              <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                <p className="text-blue-900">✓ No spelling, grammar, or style issues detected!</p>
              </div>
            ) : (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Issues Found</h3>
                {typedResult.errors.map((error: SpellingGrammarError, i: number) => (
                  <div
                    key={i}
                    className={`p-4 rounded-lg border ${
                      errorTypeColors[error.type as keyof typeof errorTypeColors] ||
                      errorTypeColors.grammar
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">📝</span>
                        <span className="font-semibold capitalize">{error.type}</span>
                      </div>
                      <span className="text-xs px-2 py-1 rounded-full bg-white bg-opacity-50">
                        {error.type}
                      </span>
                    </div>
                    
                    <div className="mb-2">
                      <p className="text-sm mb-1">
                        <span className="line-through text-red-700">{error.text}</span>
                        {' → '}
                        <span className="text-green-700 font-medium">{error.correction}</span>
                      </p>
                    </div>
                    
                    {error.context && (
                      <div className="mt-2 p-2 bg-white bg-opacity-50 rounded text-xs">
                        <span className="font-medium">Context:</span> ...{error.context}...
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Common patterns */}
            {typedResult.commonPatterns && typedResult.commonPatterns.length > 0 && (
              <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-200">
                <h3 className="text-lg font-semibold mb-3">Common Patterns</h3>
                <ul className="space-y-2">
                  {typedResult.commonPatterns.map((pattern, i) => (
                    <li key={i} className="text-sm">
                      • <strong>{pattern.type}:</strong> {pattern.description} 
                      <span className="text-gray-600"> (found {pattern.count} times)</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommendations */}
            {typedResult.recommendations && typedResult.recommendations.length > 0 && (
              <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                <h3 className="text-lg font-semibold mb-3">Writing Recommendations</h3>
                <ul className="space-y-2">
                  {typedResult.recommendations.map((rec: string, i: number) => (
                    <li key={i} className="text-sm">• {rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );
      }}
    />
  );
}