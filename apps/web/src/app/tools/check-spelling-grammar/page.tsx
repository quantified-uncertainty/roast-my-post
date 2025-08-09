'use client';

import { CheckCircleIcon, XCircleIcon, ExclamationTriangleIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { checkSpellingGrammarTool, toolSchemas } from '@roast/ai';
import { ToolPageTemplate } from '../components/ToolPageTemplate';
import type { CheckSpellingGrammarOutput } from '@roast/ai';

const severityConfig = {
  critical: {
    icon: XCircleIcon,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
  },
  major: {
    icon: ExclamationTriangleIcon,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
  },
  minor: {
    icon: ExclamationTriangleIcon,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
  },
};

// Get examples from tool config or use defaults
const examples = (checkSpellingGrammarTool.config as any).examples || [
  "Their going to there house over they're.",
  "The cat chased it's tail around the house.",
  "Me and him went to the store yesterday.",
  "I could of gone to the party but I was to tired.",
  "The data shows that sales has increased significantly."
];

function renderResult(result: CheckSpellingGrammarOutput) {
  const hasErrors = result.errors && result.errors.length > 0;
  
  return (
    <>
      {result.metadata && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Analysis Summary</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Total Errors:</span>
              <span className="text-sm font-medium">{result.metadata.totalErrorsFound}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Convention:</span>
              <span className="text-sm font-medium">{result.metadata.convention}</span>
            </div>
            {result.metadata.processingTime && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Processing Time:</span>
                <span className="text-sm font-medium">{result.metadata.processingTime}ms</span>
              </div>
            )}
          </div>
        </div>
      )}

      {hasErrors ? (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Errors Found</h2>
          <div className="space-y-4">
            {result.errors.map((error, index) => {
              const severity = error.importance > 70 ? 'critical' : error.importance > 40 ? 'major' : 'minor';
              const config = severityConfig[severity];
              const Icon = config.icon;
              
              return (
                <div key={index} className={`p-4 rounded-lg ${config.bgColor} border-l-4 border-l-${config.color}`}>
                  <div className="flex items-start">
                    <Icon className={`h-5 w-5 ${config.color} mt-0.5 mr-3 flex-shrink-0`} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-sm font-medium ${config.color}`}>
                          {error.type === 'spelling' ? 'Spelling' : 'Grammar'} Error
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-full ${config.bgColor} ${config.color}`}>
                          {severity}
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-700 mb-2">
                        <strong>Found:</strong> "{error.text}"
                      </p>
                      
                      {error.correction && (
                        <p className="text-sm text-gray-700 mb-2">
                          <strong>Suggestion:</strong> "{error.correction}"
                        </p>
                      )}
                      
                      {error.description && (
                        <p className="text-sm text-gray-600 italic">{error.description}</p>
                      )}
                      
                      {error.lineNumber && (
                        <p className="text-xs text-gray-500 mt-2">
                          Line: {error.lineNumber}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-center">
            <CheckCircleIcon className="h-6 w-6 text-green-600 mr-3" />
            <div>
              <h3 className="text-lg font-medium text-green-900">No Errors Found</h3>
              <p className="text-sm text-green-700 mt-1">
                Your text appears to be free of spelling and grammar errors.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Corrected text can be generated from the errors if needed */}
    </>
  );
}

export default function CheckSpellingGrammarPage() {
  // Get schemas directly from the generated schemas - no API fetch needed!
  const { inputSchema, outputSchema } = toolSchemas['check-spelling-grammar'];

  return (
    <ToolPageTemplate<{ text: string }, CheckSpellingGrammarOutput>
      title="Spelling & Grammar Checker"
      description="Identify and correct spelling and grammar errors in your text using advanced AI analysis. Get detailed explanations and suggestions for improvements."
      icon={DocumentTextIcon}
      warningMessage="This tool uses AI to detect errors and may not catch every issue. Always review suggestions carefully, especially for specialized or technical content."
      inputLabel="Text to Check"
      inputPlaceholder="Enter or paste your text here to check for spelling and grammar errors..."
      buttonText="Check Text"
      inputRows={10}
      examples={examples}
      toolId="check-spelling-grammar"
      renderResult={renderResult}
      prepareInput={(text) => ({ text })}
      inputSchema={inputSchema}
      outputSchema={outputSchema}
      extractLlmInteraction={(result) => (result as any).llmInteraction}
    />
  );
}