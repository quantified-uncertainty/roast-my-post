'use client';

import { DocumentTextIcon } from '@heroicons/react/24/outline';
import { checkSpellingGrammarTool, type CheckSpellingGrammarOutput } from '@roast/ai';
import { GenericToolPage } from '../components/GenericToolPage';
import { SpellingGrammarDisplay } from '../components/results/SpellingGrammarDisplay';
import { getToolExamples } from '../utils/exampleTexts';

interface SpellingGrammarInput {
  text: string;
}

const examples = getToolExamples('check-spelling-grammar') as string[];

export default function CheckSpellingGrammarPage() {
  return (
    <GenericToolPage<SpellingGrammarInput, CheckSpellingGrammarOutput>
      toolId={checkSpellingGrammarTool.config.id as keyof typeof import('@roast/ai').toolSchemas}
      title={checkSpellingGrammarTool.config.name}
      description={checkSpellingGrammarTool.config.description}
      icon={<DocumentTextIcon className="h-8 w-8 text-indigo-600" />}
      warning="This tool uses AI to detect errors and may not catch every issue. Always review suggestions carefully, especially for specialized or technical content."
      fields={[
        {
          type: 'textarea',
          name: 'text',
          label: 'Text to Check',
          placeholder: 'Enter or paste your text here to check for spelling and grammar errors...',
          rows: 10,
          required: true,
          examples: examples || undefined
        }
      ]}
      submitButtonText="Check Text"
      loadingText="Checking Text..."
      validateInput={(input) => {
        if (!input.text.trim()) return 'Please enter some text to check';
        if (input.text.length < 3) return 'Text must be at least 3 characters long';
        return true;
      }}
      renderResult={(result) => <SpellingGrammarDisplay result={result} />}
    />
  );
}