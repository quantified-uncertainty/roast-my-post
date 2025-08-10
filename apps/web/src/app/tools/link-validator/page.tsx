'use client';

import { LinkIcon } from '@heroicons/react/24/outline';
import { GenericToolPage } from '../components/GenericToolPage';
import { LinkValidationDisplay } from '../components/results';

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
  const exampleText = `Check out these resources:
- Official documentation: https://docs.example.com/guide
- GitHub repository: https://github.com/example/project
- Blog post: https://blog.example.com/2024/introduction
- Broken link: https://notarealwebsite12345.com/page
- Another resource: https://wikipedia.org/wiki/Machine_learning`;

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
      exampleInput={{ text: exampleText, checkExternal: true, followRedirects: true }}
      exampleText="Load example text with links"
      submitButtonText="Validate Links"
      loadingText="Validating Links..."
      validateInput={(input) => {
        if (!input.text.trim()) return 'Please enter text containing URLs';
        return true;
      }}
    />
  );
}