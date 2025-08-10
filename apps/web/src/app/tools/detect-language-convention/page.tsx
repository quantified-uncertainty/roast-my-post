'use client';

import { LanguageIcon } from '@heroicons/react/24/outline';
import { detectLanguageConventionTool } from '@roast/ai';
import { GenericToolPage } from '../components/GenericToolPage';
import { LanguageConventionDisplay } from '../components/results/LanguageConventionDisplay';
import { getToolExamples } from '../utils/exampleTexts';

interface LanguageConventionInput {
  text: string;
}

interface LanguageConventionResult {
  convention: 'US' | 'UK' | 'UNKNOWN';
  confidence: number;
  reasoning: string;
  indicators: {
    spelling?: string[];
    vocabulary?: string[];
    grammar?: string[];
    punctuation?: string[];
    dateFormat?: string[];
  };
}

const centralExample = getToolExamples('detect-language-convention') as string;

// Create diverse examples for better testing
const examples = [
  'The organization analyzed the color of the aluminum samples from the center of the data.',
  'The organisation analysed the colour of the aluminium samples from the centre of the data.',
  centralExample || 'The program utilizes advanced algorithms to optimize performance and minimize resource usage.'
];

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