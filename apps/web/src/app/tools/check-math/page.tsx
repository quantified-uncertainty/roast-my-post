'use client';

import { useState } from 'react';
import { CalculatorIcon } from '@heroicons/react/24/outline';
import { checkMathTool } from '@roast/ai';
import { GenericToolPage } from '../components/GenericToolPage';
import { MathCheckDisplay } from '../components/results/MathCheckDisplay';
import { examples } from './examples';

export default function MathCheckerPage() {
  const [lastStatement, setLastStatement] = useState('');

  return (
    <GenericToolPage
      toolId={checkMathTool.config.id as any}
      title={checkMathTool.config.name}
      description={checkMathTool.config.description}
      icon={<CalculatorIcon className="h-8 w-8 text-blue-600" />}
      fields={[
        {
          type: 'text',
          name: 'statement',
          label: 'Mathematical Statement',
          required: true,
          placeholder: "Enter a mathematical statement (e.g., '2 + 2 = 4')",
          className: 'font-mono text-sm'
        }
      ]}
      exampleInputs={examples ? examples.map((ex, i) => ({
        label: `Example ${i + 1}`,
        value: { statement: ex }
      })) : undefined}
      submitButtonText="Check Statement"
      loadingText="Checking Statement..."
      submitButtonClassName="!bg-green-600 hover:!bg-green-700"
      onBeforeSubmit={(input) => {
        setLastStatement(input.statement);
        return input;
      }}
      renderResult={(result) => <MathCheckDisplay result={result} statement={lastStatement} variant="basic" />}
    />
  );
}