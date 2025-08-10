'use client';

import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { fuzzyTextLocatorTool, TextLocationFinderOutput } from '@roast/ai';
import { GenericToolPage } from '../components/GenericToolPage';
import { FuzzyTextLocatorDisplay } from '../components/results/FuzzyTextLocatorDisplay';
import { examples } from './examples';

interface FuzzyLocatorInput {
  documentText: string;
  searchText: string;
}

export default function FuzzyTextLocatorPage() {
  // Create multiple examples with descriptive labels
  const exampleInputs = examples ? examples.map((ex: any, i) => {
    // Extract context from the example for a descriptive label
    const labels = [
      'Quick Brown Fox',  // Classic text with repeated phrase
      'Neural Networks',  // Technical ML content
      'Sustainable Development',  // Environmental content
      'Agile Development'  // Software development content
    ];
    
    return {
      label: labels[i] || `Example ${i + 1}`,
      value: { documentText: ex.text, searchText: ex.search }
    };
  }) : [];

  return (
    <GenericToolPage<FuzzyLocatorInput, TextLocationFinderOutput>
      toolId="fuzzy-text-locator"
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
      exampleInputs={exampleInputs}
      submitButtonText="Find Text"
      loadingText="Searching..."
      renderResult={(result) => <FuzzyTextLocatorDisplay result={result} />}
    />
  );
}
