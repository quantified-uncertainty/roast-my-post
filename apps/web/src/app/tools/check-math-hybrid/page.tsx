'use client';

import { useState } from 'react';
import { CalculatorIcon } from '@heroicons/react/24/outline';
import { checkMathHybridTool } from '@roast/ai';
import { GenericToolPage } from '../components/GenericToolPage';
import { MathCheckDisplay } from '../components/results/MathCheckDisplay';
import { examples } from './examples';

export default function CheckMathHybridPage() {
  const [lastStatement, setLastStatement] = useState('');

  return (
    <GenericToolPage
      toolId={checkMathHybridTool.config.id as any}
      title={checkMathHybridTool.config.name}
      description={checkMathHybridTool.config.description}
      icon={<CalculatorIcon className="h-8 w-8 text-purple-600" />}
      fields={[
        {
          type: 'textarea',
          name: 'statement',
          label: 'Mathematical Statement',
          required: true,
          rows: 3,
          placeholder: 'Enter a mathematical statement to verify...',
          examples: examples || undefined
        }
      ]}
      submitButtonText="Check Statement"
      loadingText="Checking..."
      submitButtonClassName="!bg-purple-600 hover:!bg-purple-700"
      onBeforeSubmit={(input) => {
        setLastStatement(input.statement);
        return input;
      }}
      renderResult={(result) => <MathCheckDisplay result={result} statement={lastStatement} variant="hybrid" />}
    />
  );
}