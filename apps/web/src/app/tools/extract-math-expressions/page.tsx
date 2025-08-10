'use client';

import { CalculatorIcon } from '@heroicons/react/24/outline';
import { extractMathExpressionsTool, type ExtractMathExpressionsOutput } from '@roast/ai';
import { GenericToolPage } from '../components/GenericToolPage';

export default function ExtractMathExpressionsPage() {
  const exampleText = `According to our analysis, revenue grew by 50% from $2 million to $3 million last year. 
The compound annual growth rate (CAGR) is calculated as (V_f/V_i)^(1/n) - 1, where n is the number of years.
With 15% of the budget allocated to R&D, that's approximately $450,000 in research spending.
The efficiency formula E = output/input shows we achieved 85% efficiency this quarter.
Our projections show that if we maintain a 7% growth rate, revenue will double in about 10 years (using the rule of 72: 72/7 ≈ 10).`;

  const getSeverityColor = (severity?: string) => {
    const colors: Record<string, string> = {
      'critical': 'bg-red-100 text-red-800',
      'major': 'bg-orange-100 text-orange-800',
      'minor': 'bg-yellow-100 text-yellow-800'
    };
    return colors[severity || ''] || 'bg-gray-100 text-gray-800';
  };

  const renderResult = (result: ExtractMathExpressionsOutput) => {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          Found {result.expressions.length} Mathematical Expression{result.expressions.length !== 1 ? 's' : ''}
        </h2>
        
        {result.expressions.length === 0 ? (
          <p className="text-gray-600">No mathematical expressions found in the text.</p>
        ) : (
          <div className="space-y-4">
            {result.expressions.map((expr, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Expression {index + 1}</span>
                    {expr.severity && (
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getSeverityColor(expr.severity)}`}>
                        {expr.severity}
                      </span>
                    )}
                    {expr.hasError && (
                      <span className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">
                        Error
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">
                    Complexity: {expr.complexityScore}/100
                  </span>
                </div>
                
                <div className="space-y-2">
                  <div className="bg-gray-50 p-2 rounded">
                    <p className="font-mono text-sm">{expr.originalText}</p>
                  </div>
                  
                  {expr.hasError && expr.errorExplanation && (
                    <div className="bg-red-50 p-2 rounded">
                      <p className="text-xs font-medium text-red-900 mb-1">Error:</p>
                      <p className="text-sm text-red-800">{expr.errorExplanation}</p>
                      {expr.correctedVersion && (
                        <div className="mt-2">
                          <p className="text-xs font-medium text-green-900">Corrected:</p>
                          <p className="font-mono text-sm text-green-800">{expr.correctedVersion}</p>
                        </div>
                      )}
                      {expr.conciseCorrection && (
                        <p className="text-xs text-gray-600 mt-1">({expr.conciseCorrection})</p>
                      )}
                    </div>
                  )}
                  
                  {expr.simplifiedExplanation && (
                    <div>
                      <p className="text-xs font-medium text-gray-600 mb-1">Simplified Explanation:</p>
                      <p className="text-sm text-gray-700">{expr.simplifiedExplanation}</p>
                    </div>
                  )}
                  
                  <div className="flex gap-4 text-xs text-gray-500">
                    <span>Importance: {expr.contextImportanceScore}/100</span>
                    {expr.hasError && <span>Severity: {expr.errorSeverityScore}/100</span>}
                    <span>Status: {expr.verificationStatus}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <GenericToolPage<{ text: string }, ExtractMathExpressionsOutput>
      toolId={extractMathExpressionsTool.config.id as keyof typeof import('@roast/ai').toolSchemas}
      title={extractMathExpressionsTool.config.name}
      description={extractMathExpressionsTool.config.description}
      icon={<CalculatorIcon className="h-8 w-8 text-indigo-600" />}
      fields={[
        {
          type: 'textarea',
          name: 'text',
          label: 'Text with Mathematical Content',
          placeholder: 'Enter text containing mathematical expressions, formulas, or calculations...',
          rows: 8,
          required: true
        }
      ]}
      renderResult={renderResult}
      exampleInput={{ text: exampleText }}
      exampleText="Load example text"
      submitButtonText="Extract Math Expressions"
      loadingText="Extracting..."
      validateInput={(input) => {
        if (!input.text.trim()) return 'Please enter some text to analyze';
        return true;
      }}
    />
  );
}