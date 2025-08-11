'use client';

import { LinkIcon } from '@heroicons/react/24/outline';
import { GenericToolPage } from '../components/GenericToolPage';
import { LinkValidationDisplay } from '../components/results';
import { examples } from './examples';

interface LinkValidationResult {
  urls: string[];
  validations: Array<{
    url: string;
    finalUrl?: string;
    timestamp: Date;
    accessible: boolean;
    error?: {
      type: string;
      message?: string;
      statusCode?: number;
    };
    details?: {
      contentType: string;
      statusCode: number;
    };
  }>;
  summary: {
    totalLinks: number;
    workingLinks: number;
    brokenLinks: number;
    errorBreakdown: Record<string, number>;
  };
}

interface LinkValidatorInput {
  text: string;
  maxUrls?: number;
}

export default function LinkValidatorPage() {

  const renderResult = (result: LinkValidationResult) => {
    // Transform the API result to match LinkValidationDisplay's expected format
    const transformedResult = {
      links: result.validations.map(v => ({
        url: v.url,
        status: v.accessible ? 'valid' as const : 'invalid' as const,
        statusCode: v.details?.statusCode || v.error?.statusCode,
        error: v.error?.message,
        redirectUrl: v.finalUrl !== v.url ? v.finalUrl : undefined,
        contentType: v.details?.contentType,
        responseTime: undefined // Not provided by API
      })),
      summary: {
        total: result.summary.totalLinks,
        valid: result.summary.workingLinks,
        invalid: result.summary.brokenLinks,
        warnings: 0 // Calculate warnings if needed
      }
    };
    
    return <LinkValidationDisplay result={transformedResult} />;
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
          required: true,
          helperText: 'The tool will extract and validate all URLs found in the text'
        },
        {
          type: 'number',
          name: 'maxUrls',
          label: 'Maximum URLs to validate',
          defaultValue: 20,
          min: 1,
          max: 100,
          helperText: 'Limit the number of URLs to validate (default: 20)'
        }
      ]}
      renderResult={renderResult}
      exampleInputs={examples ? examples.map((ex, i) => ({
        label: `Example ${i + 1}`,
        value: { text: ex, maxUrls: 20 }
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