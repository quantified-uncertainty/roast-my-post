'use client';

import { LanguageIcon } from '@heroicons/react/24/outline';
import { detectLanguageConventionTool } from '@roast/ai';
import { GenericToolPage } from '../components/GenericToolPage';
import { LanguageConventionDisplay } from '../components/results/LanguageConventionDisplay';
import { examples } from './examples';

interface LanguageConventionInput {
  text: string;
}

interface LanguageConventionResult {
  convention: 'US' | 'UK';
  confidence: number;
  consistency: number;
  evidence: Array<{
    word: string;
    convention: 'US' | 'UK';
    count: number;
  }>;
  documentType?: {
    type: 'academic' | 'technical' | 'blog' | 'casual' | 'unknown';
    confidence: number;
  };
}

export default function DetectLanguageConventionPage() {
  return (
    <GenericToolPage<LanguageConventionInput, LanguageConventionResult>
      toolId={detectLanguageConventionTool.config.id as keyof typeof import('@roast/ai').toolSchemas}
      title={detectLanguageConventionTool.config.name}
      description={detectLanguageConventionTool.config.description}
      icon={<LanguageIcon className="h-8 w-8 text-indigo-600" />}
      fields={[
        {
          type: 'textarea',
          name: 'text',
          label: 'Text to Analyze',
          placeholder: 'Enter text to detect whether it uses US or UK English conventions...',
          rows: 6,
          required: true,
          examples: examples
        }
      ]}
      submitButtonText="Detect Convention"
      loadingText="Analyzing..."
      validateInput={(input) => input.text.trim().length > 0 || 'Please enter some text to analyze'}
      renderResult={(result) => <LanguageConventionDisplay result={result} />}
    />
  );
}