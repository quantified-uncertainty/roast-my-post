'use client';

import { XCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/solid';
import { checkSpellingGrammarTool, type CheckSpellingGrammarOutput } from '@roast/ai';
import { ToolPageTemplate } from '../components/ToolPageTemplate';

const checkToolPath = checkSpellingGrammarTool.config.path;

export default function CheckSpellingGrammarPage() {
  const renderResult = (result: CheckSpellingGrammarOutput) => (
    <div className="space-y-6">
      {result.metadata && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Analysis Summary</h2>
          <div className="space-y-2">
            <p className="text-sm text-gray-600">Total Errors Found: {result.metadata.totalErrorsFound}</p>
            <p className="text-sm text-gray-600">Convention: {result.metadata.convention} English</p>
            {result.metadata.processingTime && (
              <p className="text-sm text-gray-600">Processing Time: {result.metadata.processingTime}ms</p>
            )}
          </div>
        </div>
      )}

      {result.errors && result.errors.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-medium text-gray-900">Errors Found</h2>
          {result.errors.map((error, index) => (
            <div key={index} className="bg-white shadow rounded-lg p-4">
              <div className="flex items-start space-x-3">
                {error.importance >= 70 ? (
                  <XCircleIcon className="h-5 w-5 text-red-500 mt-0.5" />
                ) : (
                  <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 capitalize">{error.type} Error</p>
                  <div className="text-sm text-gray-600 mt-1">
                    <span className="font-mono text-red-600">{error.text}</span>
                    <span className="mx-2">→</span>
                    <span className="font-mono text-green-600">{error.correction}</span>
                  </div>
                  {error.context && (
                    <p className="text-sm text-gray-500 mt-2 font-mono bg-gray-50 p-2 rounded">
                      {error.context}
                    </p>
                  )}
                  {error.description && (
                    <p className="text-sm text-gray-600 mt-2">{error.description}</p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                    {error.lineNumber && <span>Line {error.lineNumber}</span>}
                    <span>Confidence: {error.confidence}%</span>
                    <span>Importance: {error.importance}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {result.errors && result.errors.length === 0 && (
        <div className="bg-green-50 rounded-lg p-6">
          <h2 className="text-lg font-medium text-green-900 mb-2">No Errors Found</h2>
          <p className="text-sm text-green-700">
            Great! Your text appears to be free of spelling and grammar errors.
          </p>
        </div>
      )}
    </div>
  );

  const validateInput = (text: string): string | null => {
    if (text.length > 50000) {
      return 'Text is too long. Please limit to 50,000 characters.';
    }
    if (text.length < 10) {
      return 'Text is too short. Please enter at least 10 characters.';
    }
    return null;
  };

  return (
    <ToolPageTemplate<CheckSpellingGrammarOutput>
      title="Check Spelling & Grammar"
      description="Analyze text for spelling and grammar errors with detailed suggestions."
      buttonText="Check Text"
      toolPath={checkToolPath}
      renderResult={renderResult}
      validateInput={validateInput}
    />
  );
}