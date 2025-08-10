'use client';

import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { fuzzyTextLocatorTool, TextLocationFinderOutput } from '@roast/ai';
import { GenericToolPage } from '../components/GenericToolPage';
import { FuzzyTextLocatorDisplay } from '../components/results/FuzzyTextLocatorDisplay';
import { getToolExamples } from '../utils/exampleTexts';

interface FuzzyLocatorInput {
  documentText: string;
  searchText: string;
}

const examples = getToolExamples('fuzzy-text-locator') as { text: string; search: string };

export default function FuzzyTextLocatorPage() {
  return (
    <GenericToolPage<FuzzyLocatorInput, TextLocationFinderOutput>
      toolId={fuzzyTextLocatorTool.config.id as any}
      title={fuzzyTextLocatorTool.config.name}
      description={fuzzyTextLocatorTool.config.description}
      icon={<MagnifyingGlassIcon className="h-8 w-8 text-indigo-600" />}
      fields={[
        {
          type: 'textarea',
          name: 'documentText',
          label: 'Document Text',
          required: true,
          rows: 8,
          placeholder: 'Enter the document text to search in...'
        },
        {
          type: 'textarea',
          name: 'searchText',
          label: 'Text to Find',
          required: true,
          rows: 3,
          placeholder: 'Enter the text you want to find...'
        }
      ]}
      exampleInput={examples ? { documentText: examples.text, searchText: examples.search } : undefined}
      exampleText="Load Example"
      submitButtonText="Find Text"
      loadingText="Searching..."
      renderResult={(result) => <FuzzyTextLocatorDisplay result={result} />}
    />
  );
}
