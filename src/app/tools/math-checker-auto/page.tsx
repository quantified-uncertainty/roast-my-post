'use client';

import React from 'react';
import { ToolPageTemplate } from '@/components/tools/form-generators';
import { checkMathTool } from '@/tools/check-math';

interface MathError {
  type: string;
  severity: string;
  highlightedText: string;
  description: string;
  lineStart?: number;
  lineEnd?: number;
}

const exampleText = `Our analysis shows that revenue grew by 50% from $2 million to $3.5 million 
last year. With a 15% profit margin, that means we made $525,000 in profit (15% of $3.5 million).

If we maintain this growth rate, next year's revenue will be $5.25 million (50% increase from 
$3.5 million). At the same margin, profits would reach $787,500.

The compound annual growth rate (CAGR) over 3 years would be approximately 38% if we grow from 
$2 million to $5.25 million.`;

const severityColors = {
  critical: 'bg-red-100 border-red-300 text-red-900',
  major: 'bg-orange-100 border-orange-300 text-orange-900',
  minor: 'bg-yellow-100 border-yellow-300 text-yellow-900',
};

export default function MathCheckerAutoPage() {
  return (
    <ToolPageTemplate
      tool={checkMathTool}
      formConfig={{
        fieldConfigs: {
          text: {
            label: 'Text to Check',
            placeholder: 'Paste text containing calculations, statistics, or mathematical claims...',
            helpText: 'The tool will analyze this text for mathematical errors and inconsistencies.',
            rows: 10
          }
        },
        submitButtonText: 'Check Math',
        submitButtonColor: 'green',
        examples: [
          {
            name: 'Revenue Calculation Error',
            description: 'Example with percentage and growth rate errors',
            data: { text: exampleText }
          },
          {
            name: 'Simple Math Error',
            data: { 
              text: 'If we have 10 apples and eat 3, we have 8 apples left. That\'s a 25% reduction.' 
            }
          }
        ]
      }}
      renderResults={(result) => {
        const typedResult = result as { errors: MathError[] };
        const errors = typedResult.errors;
        
        return (
          <div className="space-y-6">
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <p className="text-green-900">
                Found <span className="font-semibold">{errors.length}</span> mathematical{' '}
                {errors.length === 1 ? 'error' : 'errors'}.
              </p>
            </div>

            {errors.length === 0 ? (
              <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                <p className="text-blue-900">✓ No mathematical errors detected!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {errors.map((mathError, i) => (
                  <div
                    key={i}
                    className={`p-4 rounded-lg border ${
                      severityColors[mathError.severity as keyof typeof severityColors] ||
                      severityColors.minor
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <span className="font-semibold capitalize">{mathError.type} Error</span>
                        <span className="ml-2 text-sm">({mathError.severity})</span>
                      </div>
                      {mathError.lineStart && (
                        <span className="text-sm opacity-70">
                          Line {mathError.lineStart}
                          {mathError.lineEnd && mathError.lineEnd !== mathError.lineStart && 
                            `-${mathError.lineEnd}`}
                        </span>
                      )}
                    </div>
                    
                    <div className="mb-2">
                      <span className="text-sm font-medium">Highlighted text:</span>
                      <p className="mt-1 font-mono text-sm bg-white bg-opacity-50 p-2 rounded">
                        "{mathError.highlightedText}"
                      </p>
                    </div>
                    
                    <p className="text-sm">{mathError.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      }}
    />
  );
}