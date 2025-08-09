'use client';

import { useState } from 'react';
import { checkMathWithMathJsTool, toolSchemas } from '@roast/ai';
import { CheckIcon, XMarkIcon, QuestionMarkCircleIcon, CalculatorIcon, CodeBracketIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';
import { 
  ApiDocumentationContainer, 
  SchemaSection, 
  CollapsibleSection,
  MetricDisplay 
} from '../components/SchemaComponents';
import {
  ToolPageLayout,
  ToolFormSection,
  ToolInputField,
  ToolSubmitButton,
  ToolExamples,
  ToolError,
  ToolResultSection
} from '../components/ToolPageLayout';
import { runToolWithAuth } from '@/app/tools/utils/runToolWithAuth';

const checkToolPath = checkMathWithMathJsTool.config.path;

const statusConfig = {
  verified_true: {
    icon: CheckIcon,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    label: 'Verified True'
  },
  verified_false: {
    icon: XMarkIcon,
    color: 'text-red-600', 
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    label: 'Verified False'
  },
  cannot_verify: {
    icon: QuestionMarkCircleIcon,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    label: 'Cannot Verify'
  }
};

export default function CheckMathWithMathJsPage() {
  const [statement, setStatement] = useState('');
  const [context, setContext] = useState('');
  const [result, setResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastInput, setLastInput] = useState<any>(null);

  // Get examples from the tool configuration
  const exampleStatements = (checkMathWithMathJsTool.config as any).examples || [
    '2 + 2 = 4',
    'sqrt(144) = 12',
    '10% of 50 is 5',
    '5 km + 3000 m = 8 km',
  ];

  const handleCheck = async () => {
    if (!statement.trim()) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    const input = { 
      statement,
      ...(context.trim() && { context }) 
    };
    setLastInput(input);

    try {
      const response = await runToolWithAuth('/api/tools/check-math-with-mathjs', input);
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Get input and output schemas from generated schemas
  const { inputSchema, outputSchema } = toolSchemas['check-math-with-mathjs'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleCheck();
  };

  return (
    <ToolPageLayout
      title={checkMathWithMathJsTool.config.name}
      description={checkMathWithMathJsTool.config.description}
      icon={<CalculatorIcon className="h-8 w-8 text-blue-600" />}
      warning={{
        message: 'This tool uses numerical computation (MathJS), not symbolic math. It cannot verify symbolic equations, theorems, or perform algebraic manipulations. For best results, use concrete numerical statements.',
        type: 'warning'
      }}
    >

      <ToolFormSection onSubmit={handleSubmit}>
        <ToolInputField
          label="Mathematical Statement"
          id="statement"
          value={statement}
          onChange={setStatement}
          placeholder="Enter a mathematical statement to verify..."
          required
          rows={3}
        />
        
        <ToolInputField
          label="Additional Context (Optional)"
          id="context"
          value={context}
          onChange={setContext}
          placeholder="Provide any additional context if needed..."
          rows={2}
        />
        
        <ToolSubmitButton
          isLoading={isLoading}
          disabled={!statement.trim()}
          loadingText="Verifying..."
          text="Verify Statement"
        />
      </ToolFormSection>

      <ToolExamples
        examples={exampleStatements}
        onSelect={(example) => {
          setStatement(example);
          setContext('');
        }}
      />

      {error && <ToolError error={error} />}

      {result && (
        <ToolResultSection>
          {/* Main Result */}
          <div className={`rounded-lg border p-6 ${statusConfig[result.status as keyof typeof statusConfig]?.bgColor} ${statusConfig[result.status as keyof typeof statusConfig]?.borderColor}`}>
            <div className="flex items-start space-x-3">
              {(() => {
                const config = statusConfig[result.status as keyof typeof statusConfig];
                const Icon = config?.icon || QuestionMarkCircleIcon;
                return <Icon className={`h-5 w-5 mt-0.5 ${config?.color}`} />;
              })()}
              <div className="flex-1">
                <h3 className={`text-lg font-medium ${statusConfig[result.status as keyof typeof statusConfig]?.color}`}>
                  {statusConfig[result.status as keyof typeof statusConfig]?.label || result.status}
                </h3>
                <p className="mt-2 text-sm text-gray-700">{result.explanation}</p>
                
                {result.verificationDetails && (
                  <div className="mt-4 space-y-2">
                    {result.verificationDetails.mathJsExpression && (
                      <p className="text-sm">
                        <span className="font-medium">MathJS Expression:</span> <code className="bg-white px-2 py-1 rounded">{result.verificationDetails.mathJsExpression}</code>
                      </p>
                    )}
                    {result.verificationDetails.computedValue && (
                      <p className="text-sm">
                        <span className="font-medium">Computed Value:</span> <code className="bg-white px-2 py-1 rounded">{result.verificationDetails.computedValue}</code>
                      </p>
                    )}
                  </div>
                )}
                
                {result.errorDetails && (
                  <div className="mt-4 bg-red-100 rounded p-3">
                    <p className="text-sm font-medium text-red-800">Error Type: {result.errorDetails.errorType}</p>
                    <p className="text-sm text-red-700 mt-1">Severity: {result.errorDetails.severity}</p>
                    {result.errorDetails.conciseCorrection && (
                      <p className="text-sm text-red-600 mt-2">
                        <span className="font-medium">Correction:</span> {result.errorDetails.conciseCorrection}
                      </p>
                    )}
                    {result.errorDetails.expectedValue && (
                      <p className="text-sm text-red-600 mt-1">
                        <span className="font-medium">Expected:</span> {result.errorDetails.expectedValue}
                      </p>
                    )}
                    {result.errorDetails.actualValue && (
                      <p className="text-sm text-red-600 mt-1">
                        <span className="font-medium">Actual:</span> {result.errorDetails.actualValue}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Agent Messages Section */}
          {result.llmInteraction && (
            <ApiDocumentationContainer
              title="Agent Messages"
              icon={<ChatBubbleLeftRightIcon className="h-5 w-5 text-gray-600" />}
            >
              <CollapsibleSection 
                title="LLM Interaction"
                badge={`${result.llmInteraction.tokensUsed?.total || 0} tokens`}
                borderBottom={false}
              >
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Response:</h4>
                    <pre className="text-xs bg-gray-50 p-3 rounded overflow-x-auto whitespace-pre-wrap">
                      {result.llmInteraction.response}
                    </pre>
                  </div>
                  <MetricDisplay label="Model" value={result.llmInteraction.model} />
                  <MetricDisplay label="Duration" value={result.llmInteraction.duration} unit="ms" />
                </div>
              </CollapsibleSection>
            </ApiDocumentationContainer>
          )}

          {/* API Documentation Section */}
          <ApiDocumentationContainer
            title="API Documentation"
            endpoint={checkToolPath}
            icon={<CodeBracketIcon className="h-5 w-5 text-gray-600" />}
          >
            <SchemaSection
              title="Input Schema"
              schema={inputSchema}
              example={lastInput}
              exampleTitle="Last Input"
              exampleClassName="bg-blue-50"
            />
            <SchemaSection
              title="Output Schema"
              schema={outputSchema}
              example={result}
              exampleTitle="Current Output"
              exampleClassName="bg-green-50"
              borderBottom={false}
            />
          </ApiDocumentationContainer>
        </ToolResultSection>
      )}
    </ToolPageLayout>
  );
}