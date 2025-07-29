'use client';

import React from 'react';
import { ToolPageTemplate } from '@/components/tools/form-generators';
import { checkSpellingGrammarTool } from '@/tools/check-spelling-grammar';
import { formatConciseCorrection } from '@/lib/analysis-plugins/utils/comment-styles';

export default function CheckSpellingGrammarAutoPage() {
  return (
    <ToolPageTemplate
      tool={checkSpellingGrammarTool}
      formConfig={{
        fieldOrder: ['text', 'context', 'strictness', 'convention', 'maxErrors'],
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
          strictness: {
            label: 'Checking Strictness',
            helpText: 'How thorough should the checking be?',
            options: [
              { value: 'minimal', label: 'Minimal - Only major errors' },
              { value: 'standard', label: 'Standard - Common errors and clarity issues' },
              { value: 'thorough', label: 'Thorough - All issues including style' }
            ]
          },
          convention: {
            label: 'Spelling Convention',
            helpText: 'Which English spelling convention to use',
            options: [
              { value: 'auto', label: 'Auto-detect' },
              { value: 'US', label: 'US English' },
              { value: 'UK', label: 'UK English' }
            ]
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
              strictness: 'standard',
              convention: 'auto',
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
              strictness: 'standard',
              convention: 'US',
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
              strictness: 'thorough',
              convention: 'auto',
              maxErrors: 50
            }
          }
        ]
      }}
      renderResults={(result) => {
        const typedResult = result as any;
        
        const errorTypeColors = {
          spelling: 'bg-red-100 border-red-300 text-red-900',
          grammar: 'bg-orange-100 border-orange-300 text-orange-900'
        };
        
        return (
          <div className="space-y-6">
            {/* Summary with metadata */}
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <p className="text-green-900">
                Found <span className="font-semibold">{typedResult.errors.length}</span> issues in your text
                {typedResult.metadata?.totalErrorsFound && typedResult.metadata.totalErrorsFound > typedResult.errors.length && 
                  ` (showing top ${typedResult.errors.length} of ${typedResult.metadata.totalErrorsFound} total)`}.
              </p>
              {typedResult.metadata && (
                <div className="mt-2 text-sm text-green-800 space-y-1">
                  <p>Convention: <span className="font-medium">{typedResult.metadata.convention} English</span></p>
                  {typedResult.metadata.processingTime && (
                    <p>Processing time: <span className="font-medium">{typedResult.metadata.processingTime}ms</span></p>
                  )}
                </div>
              )}
            </div>

            {/* Errors list */}
            {typedResult.errors.length === 0 ? (
              <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                <p className="text-blue-900">✓ No spelling or grammar issues detected!</p>
              </div>
            ) : (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Issues Found</h3>
                {typedResult.errors.map((error: any, i: number) => (
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
                      <div className="flex items-center gap-2">
                        {error.importance && (
                          <span className="text-xs px-2 py-1 rounded-full bg-white bg-opacity-70">
                            Importance: {error.importance}/100
                          </span>
                        )}
                        <span className="text-xs px-2 py-1 rounded-full bg-white bg-opacity-50">
                          {error.type}
                        </span>
                      </div>
                    </div>
                    
                    <div className="mb-2">
                      {error.conciseCorrection ? (
                        <div 
                          className="text-sm font-medium"
                          dangerouslySetInnerHTML={{ 
                            __html: formatConciseCorrection(error.conciseCorrection) 
                          }}
                        />
                      ) : (
                        <p className="text-sm mb-1">
                          <span className="line-through text-red-700">{error.text}</span>
                          {' → '}
                          <span className="text-green-700 font-medium">{error.correction}</span>
                        </p>
                      )}
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

            {/* JSON View at bottom */}
            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-3">Raw JSON Output</h3>
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <pre className="whitespace-pre-wrap font-mono text-sm overflow-auto">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        );
      }}
    />
  );
}