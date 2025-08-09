'use client';

import { useState } from 'react';
import { CheckCircleIcon, XCircleIcon, ExclamationTriangleIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { checkSpellingGrammarTool, toolSchemas } from '@roast/ai';
import { TabbedToolPageLayout } from '../components/TabbedToolPageLayout';
import { ToolDocumentation } from '../components/ToolDocumentation';
import { runToolWithAuth } from '../utils/runToolWithAuth';
import type { CheckSpellingGrammarOutput } from '@roast/ai';

const severityConfig = {
  critical: {
    icon: XCircleIcon,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-l-red-600',
  },
  major: {
    icon: ExclamationTriangleIcon,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-l-orange-600',
  },
  minor: {
    icon: ExclamationTriangleIcon,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-l-yellow-600',
  },
} as const;

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
                <div key={index} className={`p-4 rounded-lg ${config.bgColor} border-l-4 ${config.borderColor}`}>
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
  const [text, setText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<CheckSpellingGrammarOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Get schemas from centralized registry
  const { inputSchema, outputSchema } = toolSchemas[checkSpellingGrammarTool.config.id as keyof typeof toolSchemas];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await runToolWithAuth<{ text: string }, CheckSpellingGrammarOutput>('/api/tools/check-spelling-grammar', { text });
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Try tab content (form and results)
  const tryContent = (
    <div className="space-y-6">
      <div className="bg-amber-50 border-l-4 border-amber-400 p-4">
        <p className="text-sm text-amber-700">This tool uses AI to detect errors and may not catch every issue. Always review suggestions carefully, especially for specialized or technical content.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow-sm border">
        <div>
          <label htmlFor="text" className="block text-sm font-medium text-gray-700 mb-1">
            Text to Check <span className="text-red-500">*</span>
          </label>
          <textarea
            id="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            rows={10}
            placeholder="Enter or paste your text here to check for spelling and grammar errors..."
            required
          />
        </div>

        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Example texts:</p>
          <div className="space-y-2">
            {examples.map((example: string, i: number) => (
              <button
                key={i}
                type="button"
                onClick={() => setText(example)}
                className="block w-full text-left px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded border text-gray-700 transition-colors"
              >
                {example}
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading || !text.trim()}
          className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Checking Text...' : 'Check Text'}
        </button>
      </form>

      {error && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-800">Error: {error}</p>
        </div>
      )}

      {result && (
        <div className="mt-8">
          {renderResult(result)}
        </div>
      )}
    </div>
  );

  // README content
  const readmeContent = `# Spelling & Grammar Checker

An advanced AI-powered tool for detecting and correcting spelling and grammar errors in text. Provides detailed analysis with severity ratings, explanations, and improvement suggestions.

## Overview

The Spelling & Grammar Checker uses sophisticated AI to:

1. **Detect Errors** - Identifies spelling mistakes and grammatical issues
2. **Classify Severity** - Rates errors as critical, major, or minor
3. **Provide Corrections** - Suggests specific improvements for each error
4. **Explain Issues** - Offers detailed explanations for learning
5. **Track Metrics** - Reports total errors found and processing statistics

## Key Features

- **Dual Detection**: Catches both spelling and grammar errors
- **Severity Classification**: Critical, major, and minor error categories
- **Detailed Corrections**: Specific suggestions for each identified issue
- **Educational Explanations**: Learn from mistakes with clear descriptions
- **Line-by-Line Analysis**: Pinpoints exact location of errors
- **Processing Metrics**: Track analysis performance and statistics

## Error Severity Levels

### Critical Errors (70+ importance)
- Serious spelling mistakes that affect comprehension
- Major grammatical errors that change meaning
- Issues that significantly impact readability

### Major Errors (40-70 importance)
- Moderate spelling and grammar issues
- Errors that affect flow but don't change core meaning
- Common mistakes that should be corrected

### Minor Errors (<40 importance)
- Subtle grammatical inconsistencies
- Style preferences rather than strict errors
- Minor issues that don't significantly impact readability

## Error Types Detected

### Spelling Errors
- Misspelled words and typos
- Incorrect word forms
- Missing or extra letters
- Commonly confused words (their/there/they're)

### Grammar Errors
- Subject-verb disagreement
- Incorrect verb tenses
- Pronoun usage issues
- Sentence structure problems
- Punctuation errors

## Best Practices

1. **Review All Suggestions**: AI isn't perfect - evaluate each suggestion critically
2. **Consider Context**: Some "errors" may be intentional stylistic choices
3. **Check Specialized Terms**: Technical or domain-specific terms may be flagged incorrectly
4. **Multiple Passes**: Run the tool multiple times after making corrections
5. **Human Review**: Always have a final human review for important documents

## Use Cases

### Academic Writing
\`\`\`
Proofread essays, research papers, and academic publications for errors.
\`\`\`

### Business Communication
\`\`\`
Ensure emails, reports, and proposals are error-free and professional.
\`\`\`

### Content Creation
\`\`\`
Polish blog posts, articles, and marketing materials before publication.
\`\`\`

### Learning and Education
\`\`\`
Use detailed explanations to improve writing skills and language understanding.
\`\`\`

## Limitations

- May not catch all errors, especially context-dependent issues
- Might flag intentional stylistic choices as errors
- Less accurate with highly technical or specialized content
- Cannot replace human proofreading for critical documents
- Performance varies with text complexity and length`;

  // Docs tab content
  const docsContent = (
    <ToolDocumentation 
      toolId={checkSpellingGrammarTool.config.id}
      inputSchema={inputSchema}
      outputSchema={outputSchema}
      readmeContent={readmeContent}
    />
  );

  return (
    <TabbedToolPageLayout
      title={checkSpellingGrammarTool.config.name}
      description={checkSpellingGrammarTool.config.description}
      icon={<DocumentTextIcon className="h-8 w-8 text-indigo-600" />}
      warning="This tool uses AI to detect errors and may not catch every issue. Always review suggestions carefully, especially for specialized or technical content."
      tryContent={tryContent}
      docsContent={docsContent}
    />
  );
}