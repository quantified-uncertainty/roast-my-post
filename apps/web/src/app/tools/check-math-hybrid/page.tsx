'use client';

import { useState } from 'react';
import { toolSchemas } from '@roast/ai';
import checkMathHybridTool from '@roast/ai/tools/check-math-hybrid';
import { ApiDocumentation } from '../components/ApiDocumentation';
import {
  ToolPageLayout,
  ToolFormSection,
  ToolInputField,
  ToolSubmitButton,
  ToolExamples,
  ToolError,
  ToolResultSection
} from '../components/ToolPageLayout';
import { CalculatorIcon } from '@heroicons/react/24/outline';

interface CheckMathHybridResult {
  statement: string;
  status: 'verified_true' | 'verified_false' | 'cannot_verify';
  explanation: string;
  verifiedBy: 'mathjs' | 'llm';
  toolsUsed: string[];
  conciseCorrection?: string;
  errorDetails?: {
    errorType: string;
    severity: string;
    conciseCorrection?: string;
    expectedValue?: string;
    actualValue?: string;
  };
  mathJsResult?: {
    verificationDetails?: {
      mathJsExpression: string;
      computedValue: string;
      steps?: Array<{
        expression: string;
        result: string;
      }>;
    };
  };
  llmResult?: {
    reasoning?: string;
  };
}

export default function MathCheckerHybridPage() {
  const [statement, setStatement] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<CheckMathHybridResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastInput, setLastInput] = useState<any>(null);
  
  // Get schemas from generated schemas
  const { inputSchema, outputSchema } = toolSchemas['check-math-hybrid'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setResult(null);

    const input = { statement };
    setLastInput(input);
    
    try {
      const response = await fetch('/api/tools/check-math-hybrid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        throw new Error(`Failed: ${response.statusText}`);
      }

      const data = await response.json();
      setResult(data.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const exampleStatements = [
    '2 + 2 = 5',
    '100 - 30% = 60',
    '1 kilometer equals 100 meters',
    '15 ÷ 3 = 6',
    'π × 5² = 78.5',
    '25% of 80 is 25',
    'sqrt(16) = 5',
    '2^8 = 256',
    'The limit of 1/x as x approaches infinity is 0',
    'The derivative of x^2 is 3x'
  ];

  return (
    <ToolPageLayout
      title={checkMathHybridTool.config.name}
      description={checkMathHybridTool.config.description}
      icon={<CalculatorIcon className="h-8 w-8 text-blue-600" />}
    >

      <ToolFormSection onSubmit={handleSubmit}>
        <div className="bg-white p-6 rounded-lg shadow-sm border space-y-6">
          <ToolInputField
            label="Mathematical Statement"
            id="statement"
            type="text"
            value={statement}
            onChange={setStatement}
            placeholder="Enter a mathematical statement (e.g., '2 + 2 = 4')"
            required
          />
          
          <ToolExamples
            examples={exampleStatements}
            onSelect={setStatement}
            label="Example statements:"
          />
          
          <ToolSubmitButton
            isLoading={isLoading}
            disabled={!statement.trim()}
            loadingText="Checking Statement..."
            text="Check Statement"
          />
        </div>
      </ToolFormSection>

      {error && <ToolError error={error} />}

      {result && (
        <ToolResultSection>
          <div className={`p-6 rounded-lg border ${
            result.status === 'verified_true' 
              ? 'bg-green-50 border-green-200' 
              : result.status === 'verified_false'
              ? 'bg-red-50 border-red-200'
              : 'bg-yellow-50 border-yellow-200'
          }`}>
            <div className="mb-4">
              <h3 className="text-lg font-semibold">
                {result.status === 'verified_true' && '✓ Statement is Correct'}
                {result.status === 'verified_false' && '✗ Statement Contains Error'}
                {result.status === 'cannot_verify' && '? Cannot Verify Statement'}
              </h3>
              <div className="mt-2 flex gap-2">
                <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                  Verified by: {result.verifiedBy === 'mathjs' ? 'MathJS' : 'LLM'}
                </span>
                <span className="text-xs px-2 py-1 bg-gray-100 text-gray-800 rounded">
                  Tools used: {result.toolsUsed.join(', ')}
                </span>
              </div>
            </div>
            
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-gray-700">Statement:</p>
                <p className="mt-1 font-mono text-sm bg-white bg-opacity-60 p-2 rounded">
                  "{statement}"
                </p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-700">Explanation:</p>
                <p className="mt-1 text-sm">{result.explanation}</p>
              </div>
              
              {result.llmResult?.reasoning && (
                <div>
                  <p className="text-sm font-medium text-gray-700">Reasoning:</p>
                  <p className="mt-1 text-sm">{result.llmResult.reasoning}</p>
                </div>
              )}
              
              {result.mathJsResult?.verificationDetails && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
                  <p className="text-sm font-medium text-gray-700 mb-2">MathJS Verification:</p>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">Expression:</span> 
                      <code className="ml-2 px-2 py-1 bg-white rounded border border-gray-300">
                        {result.mathJsResult.verificationDetails.mathJsExpression}
                      </code>
                    </div>
                    <div>
                      <span className="font-medium">Computed Value:</span> 
                      <span className="ml-2 font-mono text-green-700">
                        {result.mathJsResult.verificationDetails.computedValue}
                      </span>
                    </div>
                    {result.mathJsResult.verificationDetails.steps && result.mathJsResult.verificationDetails.steps.length > 0 && (
                      <div className="mt-2">
                        <p className="font-medium mb-1">Calculation Steps:</p>
                        <div className="ml-4 space-y-1">
                          {result.mathJsResult.verificationDetails.steps.map((step, i) => (
                            <div key={i} className="font-mono text-xs">
                              <code className="bg-gray-100 px-1 rounded">{step.expression}</code>
                              <span className="mx-2">→</span>
                              <span className="text-green-700">{step.result}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="mt-3 text-xs text-gray-600">
                    <a 
                      href={`https://mathjs.org/examples/browser/basic_usage.html.html#${encodeURIComponent(result.mathJsResult.verificationDetails.mathJsExpression)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      Try in MathJS calculator →
                    </a>
                  </div>
                </div>
              )}
              
              {result.errorDetails && (
                <div className="mt-4 p-3 bg-white bg-opacity-60 rounded">
                  <p className="text-sm font-medium text-gray-700 mb-2">Error Details:</p>
                  <div className="space-y-1 text-sm">
                    <p><span className="font-medium">Type:</span> {result.errorDetails.errorType}</p>
                    <p><span className="font-medium">Severity:</span> {result.errorDetails.severity}</p>
                    {result.errorDetails.conciseCorrection && (
                      <p><span className="font-medium">Correction:</span> {result.errorDetails.conciseCorrection}</p>
                    )}
                    {result.errorDetails.expectedValue && (
                      <p><span className="font-medium">Expected:</span> {result.errorDetails.expectedValue}</p>
                    )}
                    {result.errorDetails.actualValue && (
                      <p><span className="font-medium">Actual:</span> {result.errorDetails.actualValue}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </ToolResultSection>
      )}

      {/* API Documentation */}
      <ApiDocumentation
        inputSchema={inputSchema}
        outputSchema={outputSchema}
        lastInput={lastInput}
        lastOutput={result}
        endpoint="/api/tools/check-math-hybrid"
      />
    </ToolPageLayout>
  );
}