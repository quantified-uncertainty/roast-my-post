'use client';

import React from 'react';
import { ToolPageTemplate } from '@/components/tools/form-generators';
import { checkSpellingGrammarTool } from '@/tools/check-spelling-grammar';
import { CommentSeverity, importanceToSeverity } from '@/tools/check-spelling-grammar/comment-styles';
import { generateSpellingComment, generateDocumentSummary, type SpellingErrorWithLocation } from '@/tools/check-spelling-grammar/commentGeneration';
import { calculateGrade, countWords } from '@/tools/check-spelling-grammar/grading';

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
        
        // Calculate grade based on word count from input
        const wordCount = countWords((result as any).input?.text || '');
        const gradeResult = calculateGrade(typedResult.errors, wordCount);
        
        // Convert errors to SpellingErrorWithLocation format for summary
        const errorsWithLocation: SpellingErrorWithLocation[] = typedResult.errors.map((error: any) => ({
          error,
          location: {
            lineNumber: error.lineNumber || 1,
            columnNumber: 0
          }
        }));
        
        // Get severity-based colors
        const getSeverityColors = (importance: number) => {
          const severity = importanceToSeverity(importance);
          switch(severity) {
            case CommentSeverity.CRITICAL:
            case CommentSeverity.HIGH:
              return 'bg-red-100 border-red-300 text-red-900';
            case CommentSeverity.MEDIUM:
              return 'bg-orange-100 border-orange-300 text-orange-900';
            case CommentSeverity.LOW:
              return 'bg-yellow-100 border-yellow-300 text-yellow-900';
            case CommentSeverity.INFO:
            default:
              return 'bg-blue-100 border-blue-300 text-blue-900';
          }
        };
        
        return (
          <div className="space-y-6">
            {/* Grade and Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className={`p-4 rounded-lg border ${
                gradeResult.grade >= 90 ? 'bg-green-50 border-green-200' :
                gradeResult.grade >= 80 ? 'bg-blue-50 border-blue-200' :
                gradeResult.grade >= 70 ? 'bg-yellow-50 border-yellow-200' :
                gradeResult.grade >= 50 ? 'bg-orange-50 border-orange-200' :
                'bg-red-50 border-red-200'
              }`}>
                <h3 className="text-lg font-semibold mb-2">Writing Grade</h3>
                <div className="text-3xl font-bold mb-1">{gradeResult.grade}/100</div>
                <p className="text-sm font-medium">{gradeResult.category}</p>
                <p className="text-sm mt-2">{gradeResult.description}</p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="text-lg font-semibold mb-2">Analysis Summary</h3>
                <div className="text-sm space-y-1">
                  <p>Total errors: <span className="font-medium">{typedResult.errors.length}</span>
                    {typedResult.metadata?.totalErrorsFound && typedResult.metadata.totalErrorsFound > typedResult.errors.length && 
                      ` (showing top ${typedResult.errors.length} of ${typedResult.metadata.totalErrorsFound})`}
                  </p>
                  <p>Word count: <span className="font-medium">{wordCount}</span></p>
                  <p>Error density: <span className="font-medium">{gradeResult.statistics.errorDensity}</span> per 100 words</p>
                  {typedResult.metadata && (
                    <p>Convention: <span className="font-medium">{typedResult.metadata.convention} English</span></p>
                  )}
                </div>
              </div>
            </div>
            
            {/* Document Summary */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 prose prose-sm max-w-none">
              <div dangerouslySetInnerHTML={{ 
                __html: generateDocumentSummary(errorsWithLocation).replace(/\n/g, '<br>').replace(/##\s+(.+)/g, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>').replace(/###\s+(.+)/g, '<h4 class="text-base font-semibold mt-3 mb-1">$1</h4>')
              }} />
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
                    className={`p-4 rounded-lg border ${getSeverityColors(error.importance)}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">📝</span>
                        <span className="font-semibold capitalize">{error.type}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {error.confidence && (
                          <span className="text-xs px-2 py-1 rounded-full bg-white bg-opacity-50">
                            Confidence: {error.confidence}%
                          </span>
                        )}
                        {error.importance && (
                          <span className="text-xs px-2 py-1 rounded-full bg-white bg-opacity-70">
                            Importance: {error.importance}/100
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="mb-2">
                      <div 
                        className="text-sm"
                        dangerouslySetInnerHTML={{ 
                          __html: generateSpellingComment(error)
                        }}
                      />
                    </div>
                    
                    {error.context && (
                      <div className="mt-2 p-2 bg-white bg-opacity-50 rounded text-xs">
                        <span className="font-medium">Context:</span> ...{error.context}...
                        {error.lineNumber && (
                          <span className="ml-2 text-gray-600">(Line {error.lineNumber})</span>
                        )}
                      </div>
                    )}
                    
                    {error.description && (
                      <div className="mt-2 p-2 bg-white bg-opacity-70 rounded text-sm italic">
                        {error.description}
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