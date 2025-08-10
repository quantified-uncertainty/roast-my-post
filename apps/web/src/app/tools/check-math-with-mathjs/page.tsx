'use client';

import { useState } from 'react';
import { CalculatorIcon } from '@heroicons/react/24/outline';
import { checkMathWithMathJsTool } from '@roast/ai';
import { GenericToolPage } from '../components/GenericToolPage';
import { MathCheckDisplay } from '../components/results/MathCheckDisplay';
import { examples } from './examples';

export default function CheckMathWithMathJSPage() {
  const [lastStatement, setLastStatement] = useState('');

  return (
    <GenericToolPage
      toolId={checkMathWithMathJsTool.config.id as any}
      title={checkMathWithMathJsTool.config.name}
      description={checkMathWithMathJsTool.config.description}
      icon={<CalculatorIcon className="h-8 w-8 text-indigo-600" />}
      fields={[
        {
          type: 'text',
          name: 'statement',
          label: 'Mathematical Statement',
          required: true,
          placeholder: "Enter a mathematical statement (e.g., '2 + 2 = 4')",
          className: 'font-mono'
        }
      ]}
      exampleInputs={examples ? examples.map((ex, i) => ({
        label: `Example ${i + 1}`,
        value: { statement: ex }
      })) : undefined}
      submitButtonText="Verify Statement"
      loadingText="Verifying..."
      submitButtonClassName="!bg-indigo-600 hover:!bg-indigo-700"
      onBeforeSubmit={(input) => {
        setLastStatement(input.statement);
        return input;
      }}
      renderResult={(result) => <MathCheckDisplay result={result} statement={lastStatement} variant="mathjs" />}
    />
  );
}