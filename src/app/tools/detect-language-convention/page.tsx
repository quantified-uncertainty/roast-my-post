'use client';

import { ToolPageTemplate } from '@/components/tools/form-generators/ToolPageTemplate';
import { detectLanguageConventionTool } from '@/tools/detect-language-convention';
// Using div with card styling instead of Card component

const exampleTexts = {
  us: `I organized a program to analyze the behavior patterns in our data center. We utilized specialized algorithms to optimize performance and minimize errors. The color-coded visualization helped identify key areas for improvement.`,
  
  uk: `I organised a programme to analyse the behaviour patterns in our data centre. We utilised specialised algorithms to optimise performance and minimise errors. The colour-coded visualisation helped identify key areas for improvement.`,
  
  mixed: `I organized the programme to analyse behavior in our data center. We utilised specialized algorithms to optimize performance.`,
  
  academic: `Abstract: This study examines the theoretical framework underlying neural network optimization. Previous empirical studies have demonstrated significant improvements in performance metrics. Our methodology involves systematic analysis of convergence patterns across multiple architectures.`
};

interface DetectionResult {
  convention: 'US' | 'UK';
  confidence: number;
  consistency: number;
  evidence: Array<{
    word: string;
    convention: 'US' | 'UK';
    count: number;
  }>;
  documentType?: {
    type: string;
    confidence: number;
  };
}

export default function DetectLanguageConventionPage() {
  const renderResult = (result: any) => {
    const detectionResult = result as DetectionResult;
    
    return (
      <div className="space-y-6">
        {/* Main Detection Results */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4">Detection Results</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Convention:</span>
              <span className={`font-semibold px-3 py-1 rounded-full ${
                detectionResult.confidence === 0 ? 'bg-gray-100 text-gray-600' :
                detectionResult.convention === 'US' ? 'bg-blue-100 text-blue-800' :
                'bg-purple-100 text-purple-800'
              }`}>
                {detectionResult.convention} English
                {detectionResult.confidence === 0 && ' (default)'}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Confidence:</span>
              <div className="flex items-center gap-2">
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-500 ${
                      detectionResult.confidence === 0 ? 'bg-gray-400' : 'bg-green-500'
                    }`}
                    style={{ width: `${detectionResult.confidence * 100}%` }}
                  />
                </div>
                <span className="text-sm font-medium">
                  {Math.round(detectionResult.confidence * 100)}%
                  {detectionResult.confidence === 0 && (
                    <span className="text-gray-500 ml-1">(insufficient evidence)</span>
                  )}
                </span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Consistency:</span>
              <div className="flex items-center gap-2">
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-500 ${
                      detectionResult.consistency > 0.8 ? 'bg-green-500' :
                      detectionResult.consistency > 0.5 ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`}
                    style={{ width: `${detectionResult.consistency * 100}%` }}
                  />
                </div>
                <span className="text-sm font-medium">
                  {Math.round(detectionResult.consistency * 100)}%
                  {detectionResult.consistency < 0.8 && (
                    <span className="text-gray-500 ml-1">(mixed usage)</span>
                  )}
                </span>
              </div>
            </div>
            
            {detectionResult.documentType && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Document Type:</span>
                <span className="font-medium capitalize">
                  {detectionResult.documentType.type}
                  {detectionResult.documentType.confidence > 0 && (
                    <span className="text-gray-500 text-sm ml-2">
                      ({Math.round(detectionResult.documentType.confidence * 100)}%)
                    </span>
                  )}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Evidence */}
        {detectionResult.evidence && detectionResult.evidence.length > 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4">Evidence Found</h3>
            
            <div className="space-y-2">
              {detectionResult.evidence.map((item, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm">{item.word}</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      item.convention === 'US' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'
                    }`}>
                      {item.convention}
                    </span>
                  </div>
                  <span className="text-gray-500 text-sm">
                    {item.count} occurrence{item.count !== 1 ? 's' : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-amber-50 rounded-lg shadow-sm border border-amber-200 p-6">
            <h3 className="text-lg font-semibold mb-2 text-amber-900">No Convention Markers Found</h3>
            <p className="text-sm text-amber-800">
              The text doesn't contain enough US/UK spelling differences to determine the convention. 
              We need at least 3 indicator words (like organize/organise, color/colour) to make a reliable determination.
            </p>
            <p className="text-sm text-amber-700 mt-2">
              Default: US English (with 0% confidence)
            </p>
          </div>
        )}

        {/* Explanation */}
        <div className="bg-gray-50 rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-2">How It Works</h3>
          <p className="text-sm text-gray-600">
            This tool uses pattern matching to detect whether text follows US or UK English spelling conventions. 
            It analyzes common spelling differences (like -ize vs -ise, -or vs -our) and provides a confidence 
            score based on the consistency and quantity of evidence found.
          </p>
        </div>
      </div>
    );
  };

  return (
    <ToolPageTemplate
      tool={detectLanguageConventionTool}
      renderResults={renderResult}
      formConfig={{
        fieldConfigs: {
          text: {
            rows: 10,
            placeholder: 'Paste or type your text here to detect US or UK English conventions...'
          }
        },
        examples: [
          {
            name: 'US English',
            description: 'Example of US English spelling conventions',
            data: { text: exampleTexts.us }
          },
          {
            name: 'UK English', 
            description: 'Example of UK English spelling conventions',
            data: { text: exampleTexts.uk }
          },
          {
            name: 'Mixed Conventions',
            description: 'Text with mixed US/UK spelling',
            data: { text: exampleTexts.mixed }
          },
          {
            name: 'Academic Text',
            description: 'Academic writing sample',
            data: { text: exampleTexts.academic }
          }
        ]
      }}
    />
  );
}