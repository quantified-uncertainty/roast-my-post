'use client';

import { CalculatorIcon } from '@heroicons/react/24/outline';
import { extractMathExpressionsTool, type ExtractMathExpressionsOutput } from '@roast/ai';
import { GenericToolPage } from '../components/GenericToolPage';
import { getSeverityColor } from '../utils/resultFormatting';
import { toolExamples } from '../utils/exampleTexts';

export default function ExtractMathExpressionsPage() {
  const examples = toolExamples['extract-math-expressions'] as string[];

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
      exampleInputs={examples ? examples.map((ex, i) => ({
        label: `Example ${i + 1}`,
        value: { text: ex }
      })) : undefined}
      submitButtonText="Extract Math Expressions"
      loadingText="Extracting..."
      validateInput={(input) => {
        if (!input.text.trim()) return 'Please enter some text to analyze';
        return true;
      }}
    />
  );
}