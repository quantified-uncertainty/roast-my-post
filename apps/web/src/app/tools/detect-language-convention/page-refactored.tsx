'use client';

import { detectLanguageConventionTool, type DetectLanguageConventionOutput } from '@roast/ai';
import { ToolPageTemplate } from '../components/ToolPageTemplate';

const checkToolPath = detectLanguageConventionTool.config.path;

export default function DetectLanguageConventionPage() {
  const renderResult = (result: DetectLanguageConventionOutput) => (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Detected Convention</h2>
        <div className="space-y-2">
          <p className="text-2xl font-bold">{result.convention || 'Unknown'} English</p>
          {result.confidence !== undefined && (
            <p className="text-sm text-gray-600">Confidence: {Math.round(result.confidence * 100)}%</p>
          )}
          {result.consistency !== undefined && (
            <p className="text-sm text-gray-600">Consistency: {Math.round(result.consistency * 100)}%</p>
          )}
        </div>
      </div>

      {result.documentType && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Document Type</h2>
          <div className="space-y-2">
            <p className="text-lg font-semibold capitalize">{result.documentType.type || 'Unknown'}</p>
            {result.documentType.confidence !== undefined && (
              <p className="text-sm text-gray-600">Confidence: {Math.round(result.documentType.confidence * 100)}%</p>
            )}
          </div>
        </div>
      )}

      {result.evidence && result.evidence.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Evidence</h2>
          <ul className="space-y-2">
            {result.evidence.map((item, index) => (
              <li key={index} className="flex items-start">
                <span className="text-sm text-gray-900">
                  • {item.word} ({item.convention}): {item.count} occurrence{item.count !== 1 ? 's' : ''}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );

  return (
    <ToolPageTemplate<DetectLanguageConventionOutput>
      title="Detect Language Convention"
      description="Analyze text to detect the language variant (US English, UK English, etc.)."
      buttonText="Analyze Text"
      toolPath={checkToolPath}
      renderResult={renderResult}
    />
  );
}