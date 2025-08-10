'use client';

import { LinkIcon } from '@heroicons/react/24/outline';
import { GenericToolPage } from '../components/GenericToolPage';
import { LinkValidationDisplay } from '../components/results';
import { toolExamples } from '../utils/exampleTexts';

interface LinkValidationResult {
  links: Array<{
    url: string;
    status: 'valid' | 'invalid' | 'warning';
    statusCode?: number;
    error?: string;
    redirectUrl?: string;
    contentType?: string;
    responseTime?: number;
  }>;
  summary: {
    total: number;
    valid: number;
    invalid: number;
    warnings: number;
  };
}

interface LinkValidatorInput {
  text: string;
  checkExternal: boolean;
  followRedirects: boolean;
}

export default function LinkValidatorPage() {
  const examples = toolExamples['link-validator'] as string[];

  const renderResult = (result: LinkValidationResult) => {
    return <LinkValidationDisplay result={result} />;
  };

  return (
    <GenericToolPage<LinkValidatorInput, LinkValidationResult>
      toolId="link-validator"
      title="Link Validator"
      description="Extract and validate URLs from text, checking their accessibility and status"
      icon={<LinkIcon className="h-8 w-8 text-indigo-600" />}
      fields={[
        {
          type: 'textarea',
          name: 'text',
          label: 'Text with URLs',
          placeholder: 'Enter text containing URLs to validate...',
          rows: 8,
          required: true
        },
        {
          type: 'checkbox',
          name: 'checkExternal',
          label: 'Check external links (makes HTTP requests)',
          defaultValue: true
        },
        {
          type: 'checkbox',
          name: 'followRedirects',
          label: 'Follow redirects',
          defaultValue: true
        }
      ]}
      renderResult={renderResult}
      exampleInputs={examples ? examples.map((ex, i) => ({
        label: `Example ${i + 1}`,
        value: { text: ex, checkExternal: true, followRedirects: true }
      })) : undefined}
      submitButtonText="Validate Links"
      loadingText="Validating Links..."
      validateInput={(input) => {
        if (!input.text.trim()) return 'Please enter text containing URLs';
        return true;
      }}
    />
  );
}