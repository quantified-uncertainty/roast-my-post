'use client';

import { DocumentTextIcon } from '@heroicons/react/24/outline';
import { checkSpellingGrammarTool, type CheckSpellingGrammarOutput } from '@roast/ai';
import { GenericToolPage } from '../components/GenericToolPage';
import { SpellingGrammarDisplay } from '../components/results/SpellingGrammarDisplay';
import { commonFields } from '../utils/fieldConfigs';
import { examples } from './examples';

interface SpellingGrammarInput {
  text: string;
}


export default function CheckSpellingGrammarPage() {
  return (
    <GenericToolPage<SpellingGrammarInput, CheckSpellingGrammarOutput>
      toolId="check-spelling-grammar"
      title={checkSpellingGrammarTool.config.name}
      description={checkSpellingGrammarTool.config.description}
      icon={<DocumentTextIcon className="h-8 w-8 text-indigo-600" />}
      warning="This tool uses AI to detect errors and may not catch every issue. Always review suggestions carefully, especially for specialized or technical content."
      fields={[
        commonFields.textAnalysis('text', 'Text to Check')
      ]}
      exampleInputs={examples.map((ex, i) => ({
        label: `Example ${i + 1}`,
        value: { text: ex }
      }))}
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