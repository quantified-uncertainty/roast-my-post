'use client';

import { DocumentTextIcon } from '@heroicons/react/24/outline';
import { documentChunkerTool, type DocumentChunkerOutput } from '@roast/ai';
import { GenericToolPage } from '../components/GenericToolPage';
import { DocumentChunkerDisplay } from '../components/results/DocumentChunkerDisplay';
import { examples } from './examples';

interface ChunkerInput {
  text: string;
  maxChunkSize: number;
  overlap: number;
}

export default function DocumentChunkerPage() {

  const renderResult = (result: DocumentChunkerOutput) => {
    return <DocumentChunkerDisplay result={result} />;
  };

  return (
    <GenericToolPage<ChunkerInput, DocumentChunkerOutput>
      toolId={documentChunkerTool.config.id as keyof typeof import('@roast/ai').toolSchemas}
      title={documentChunkerTool.config.name}
      description={documentChunkerTool.config.description}
      icon={<DocumentTextIcon className="h-8 w-8 text-indigo-600" />}
      fields={[
        {
          type: 'textarea',
          name: 'text',
          label: 'Document Text',
          placeholder: 'Enter or paste your document text here...',
          rows: 10,
          required: true,
          helperText: 'The text will be split into overlapping chunks for processing'
        },
        {
          type: 'number',
          name: 'maxChunkSize',
          label: 'Maximum Chunk Size',
          defaultValue: 1000,
          min: 100,
          max: 5000,
          step: 100,
          helperText: 'Maximum number of characters per chunk'
        },
        {
          type: 'number',
          name: 'overlap',
          label: 'Overlap Size',
          defaultValue: 100,
          min: 0,
          max: 500,
          step: 50,
          helperText: 'Number of overlapping characters between chunks'
        }
      ]}
      renderResult={renderResult}
      exampleInputs={examples ? examples.map((ex, i) => ({
        label: `Example ${i + 1}`,
        value: { text: ex, maxChunkSize: 1000, overlap: 100 }
      })) : undefined}
      submitButtonText="Chunk Document"
      loadingText="Chunking Document..."
      validateInput={(input) => {
        if (!input.text.trim()) return 'Please enter document text';
        if (input.text.length < 50) return 'Document must be at least 50 characters';
        if (input.overlap >= input.maxChunkSize) return 'Overlap must be less than chunk size';
        return true;
      }}
      warning="Chunks are created based on character count. Consider semantic boundaries for better results."
    />
  );
}