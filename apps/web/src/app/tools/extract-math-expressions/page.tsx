'use client';

import React from 'react';
import { ToolPageTemplate } from '@/components/tools/form-generators';
import { extractMathExpressionsTool } from '@/tools/extract-math-expressions';

export default function ExtractMathExpressionsPage() {
  return (
    <ToolPageTemplate
      tool={extractMathExpressionsTool}
      formConfig={{
        fieldOrder: ['text', 'verifyCalculations', 'includeContext'],
        fieldConfigs: {
          text: {
            label: 'Text to Analyze',
            placeholder: 'Paste text containing mathematical expressions...',
            helpText: 'The tool will extract and analyze mathematical expressions, formulas, and calculations',
            rows: 10
          },
          verifyCalculations: {
            label: 'Verify Calculations',
            helpText: 'Check mathematical expressions for calculation errors'
          },
          includeContext: {
            label: 'Include Context',
            helpText: 'Provide contextual analysis and simplified explanations'
          }
        },
        submitButtonText: 'Extract Math Expressions',
        submitButtonColor: 'purple',
        examples: [
          {
            name: 'Scientific Paper',
            description: 'Research with formulas and calculations',
            data: {
              text: `In our study, we calculated the mean velocity using v = d/t, where d = 150 meters and t = 5 seconds, giving us v = 30 m/s.

The acceleration was determined using a = (v_f - v_i)/t, with v_f = 30 m/s, v_i = 0 m/s, and t = 5s, resulting in a = 6 m/s².

Using Newton's second law F = ma, with m = 2.5 kg and a = 6 m/s², we found F = 15 N.

The kinetic energy was calculated as KE = ½mv², where ½ × 2.5 kg × (30 m/s)² = 1,125 J.`,
              verifyCalculations: true,
              includeContext: true
            }
          },
          {
            name: 'Financial Analysis',
            description: 'Business calculations and financial formulas',
            data: {
              text: `The compound interest calculation follows A = P(1 + r/n)^(nt), where:
- P = $10,000 (principal)
- r = 0.05 (5% annual rate)
- n = 12 (compounded monthly)
- t = 3 years

Therefore: A = 10,000(1 + 0.05/12)^(12×3) = 10,000(1.004167)^36 = $11,616.17

The ROI was calculated as (Final Value - Initial Investment) / Initial Investment × 100 = ($11,616.17 - $10,000) / $10,000 × 100 = 16.16%`,
              verifyCalculations: true,
              includeContext: true
            }
          },
          {
            name: 'Engineering Report',
            description: 'Technical calculations with units',
            data: {
              text: `The stress calculation used σ = F/A, where F = 5,000 N and A = 0.02 m², giving σ = 250,000 Pa.

The factor of safety was determined as FoS = σ_ultimate / σ_working = 400 MPa / 250 MPa = 1.6.

Power consumption was calculated using P = VI, where V = 120V and I = 8.5A, resulting in P = 1,020 W = 1.02 kW.

Energy consumption over 24 hours: E = P × t = 1.02 kW × 24 h = 24.48 kWh.`,
              verifyCalculations: true,
              includeContext: true
            }
          },
          {
            name: 'Chemistry Problem',
            description: 'Chemical calculations and stoichiometry',
            data: {
              text: `Using the ideal gas law PV = nRT, we calculated the number of moles:
- P = 2.5 atm
- V = 5.0 L  
- R = 0.0821 L·atm/(mol·K)
- T = 298 K

Therefore: n = PV/RT = (2.5 × 5.0)/(0.0821 × 298) = 12.5/24.47 = 0.51 mol

The molarity was calculated as M = n/V = 0.51 mol / 0.5 L = 1.02 M`,
              verifyCalculations: true,
              includeContext: true
            }
          }
        ]
      }}
      renderResults={(result) => {
        const typedResult = result as any;
        const expressions = typedResult.expressions || [];
        
        // Sort by context importance and error severity
        const sortedExpressions = [...expressions].sort((a, b) => {
          if (a.hasError !== b.hasError) return a.hasError ? -1 : 1;
          return (b.contextImportanceScore + b.errorSeverityScore) - (a.contextImportanceScore + a.errorSeverityScore);
        });
        
        const errorExpressions = expressions.filter((expr: any) => expr.hasError);
        const verifiedExpressions = expressions.filter((expr: any) => expr.verificationStatus === 'verified');
        
        return (
          <div className="space-y-6">
            {/* Summary */}
            <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
              <p className="text-purple-900">
                Found <span className="font-semibold">{expressions.length}</span> mathematical expressions.
                {errorExpressions.length > 0 && (
                  <span className="text-red-700">
                    {' '}{errorExpressions.length} contain errors.
                  </span>
                )}
                {' '}{verifiedExpressions.length} successfully verified.
              </p>
            </div>

            {/* Error expressions first */}
            {errorExpressions.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-red-800">
                  ⚠️ Expressions with Errors ({errorExpressions.length})
                </h3>
                {errorExpressions.map((expr: any, i: number) => (
                  <div key={`error-${i}`} className="rounded-lg border border-red-200 bg-red-50 p-6">
                    <div className="mb-4">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="text-lg font-semibold text-red-900">
                          Expression {i + 1}
                        </h4>
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            {expr.errorType || 'Error'}
                          </span>
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                            Severity: {expr.errorSeverityScore}
                          </span>
                        </div>
                      </div>
                      <div className="bg-white p-3 rounded border font-mono text-sm">
                        {expr.originalText}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <span className="font-medium text-red-900">Error Explanation:</span>
                        <p className="text-red-800 mt-1">{expr.errorExplanation}</p>
                      </div>
                      
                      {expr.correctedVersion && (
                        <div>
                          <span className="font-medium text-red-900">Corrected Version:</span>
                          <div className="bg-green-50 border border-green-200 p-3 rounded font-mono text-sm mt-1">
                            {expr.correctedVersion}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* All expressions */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">All Mathematical Expressions</h3>
              <div className="space-y-4">
                {sortedExpressions.map((expr: any, i: number) => (
                  <div key={i} className={`rounded-lg border p-6 ${
                    expr.hasError 
                      ? 'border-red-200 bg-red-50' 
                      : expr.verificationStatus === 'verified'
                      ? 'border-green-200 bg-green-50'
                      : 'border-gray-200 bg-white'
                  }`}>
                    <div className="mb-4">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="text-lg font-semibold">
                          Expression {i + 1}
                        </h4>
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            expr.verificationStatus === 'verified' ? 'bg-green-100 text-green-800' :
                            expr.verificationStatus === 'unverified' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {expr.verificationStatus}
                          </span>
                          {expr.hasError && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              Error
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="bg-white p-3 rounded border font-mono text-sm">
                        {expr.originalText}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="text-center">
                        <span className="block text-sm font-medium text-gray-600">Complexity</span>
                        <span className="text-xl font-semibold">{expr.complexityScore}</span>
                        <div className={`mt-1 h-2 rounded-full ${
                          expr.complexityScore >= 80 ? 'bg-red-200' :
                          expr.complexityScore >= 60 ? 'bg-orange-200' :
                          expr.complexityScore >= 40 ? 'bg-yellow-200' :
                          'bg-green-200'
                        }`}>
                          <div 
                            className={`h-full rounded-full ${
                              expr.complexityScore >= 80 ? 'bg-red-500' :
                              expr.complexityScore >= 60 ? 'bg-orange-500' :
                              expr.complexityScore >= 40 ? 'bg-yellow-500' :
                              'bg-green-500'
                            }`}
                            style={{ width: `${expr.complexityScore}%` }}
                          />
                        </div>
                      </div>
                      
                      <div className="text-center">
                        <span className="block text-sm font-medium text-gray-600">Importance</span>
                        <span className="text-xl font-semibold">{expr.contextImportanceScore}</span>
                        <div className="mt-1 h-2 bg-blue-200 rounded-full">
                          <div 
                            className="h-full bg-blue-500 rounded-full"
                            style={{ width: `${expr.contextImportanceScore}%` }}
                          />
                        </div>
                      </div>
                      
                      {expr.hasError && (
                        <div className="text-center">
                          <span className="block text-sm font-medium text-gray-600">Error Severity</span>
                          <span className="text-xl font-semibold text-red-600">{expr.errorSeverityScore}</span>
                          <div className="mt-1 h-2 bg-red-200 rounded-full">
                            <div 
                              className="h-full bg-red-500 rounded-full"
                              style={{ width: `${expr.errorSeverityScore}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {expr.simplifiedExplanation && (
                      <div className="mb-3">
                        <span className="font-medium text-gray-700">Explanation:</span>
                        <p className="text-gray-600 mt-1">{expr.simplifiedExplanation}</p>
                      </div>
                    )}

                    {expr.hasError && (
                      <div className="space-y-2">
                        {expr.errorExplanation && (
                          <div>
                            <span className="font-medium text-red-700">Error:</span>
                            <p className="text-red-600 mt-1">{expr.errorExplanation}</p>
                          </div>
                        )}
                        {expr.correctedVersion && (
                          <div>
                            <span className="font-medium text-green-700">Correction:</span>
                            <div className="bg-green-100 border border-green-300 p-2 rounded font-mono text-sm mt-1">
                              {expr.correctedVersion}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Raw JSON Data */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Raw LLM Response Data</h3>
              <div className="overflow-x-auto rounded-lg bg-gray-900 p-4 text-gray-100">
                <pre className="text-xs">
                  {JSON.stringify(typedResult, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        );
      }}
    />
  );
}