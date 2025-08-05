'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CheckCircleIcon, XCircleIcon, ExclamationTriangleIcon, LinkIcon, ChevronLeftIcon } from '@heroicons/react/24/solid';
import { linkValidator } from '@roast/ai/server';
import { runToolWithAuth } from '@/app/tools/utils/runToolWithAuth';

const linkValidatorPath = linkValidator.config.path;

interface LinkValidation {
  url: string;
  finalUrl?: string;
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
}

const exampleTexts = [
  {
    title: 'Blog post with mixed links',
    content: `# My Blog Post

Check out the official [React documentation](https://react.dev) for more information.

I found this interesting article at https://example.com/article and also referenced some research from https://arxiv.org/abs/2301.12345.

Here's a broken link: [Old tutorial](https://outdated-site-12345.com/tutorial)

And here's an image reference: ![Screenshot](https://github.com/user/repo/blob/main/image.png)`
  },
  {
    title: 'Academic paper excerpt',
    content: `Recent studies (Smith et al., 2023) have shown significant improvements in model performance. The dataset is available at https://huggingface.co/datasets/example/dataset.

For implementation details, see the official repository: [https://github.com/research-lab/model](https://github.com/research-lab/model)

Additional resources:
- Training code: https://colab.research.google.com/drive/1234567890
- Paper: [https://arxiv.org/abs/2312.00001](https://arxiv.org/abs/2312.00001)
- Demo: https://demo-site-that-might-not-exist.com`
  },
  {
    title: 'Documentation with various link types',
    content: `## Installation Guide

Download the latest version from our [releases page](https://github.com/myproject/releases).

### Quick Links
- Documentation: <https://docs.myproject.com>
- API Reference: https://api.myproject.com/v1/docs
- Community Forum: [Join our discussion](https://forum.myproject.com)
- Status Page: https://status.myproject.com

For support, visit https://support.myproject.com or email support@myproject.com (not a link).`
  }
];

export default function LinkValidatorPage() {
  const [text, setText] = useState('');
  const [result, setResult] = useState<{
    urls: string[];
    validations: LinkValidation[];
    summary: {
      totalLinks: number;
      workingLinks: number;
      brokenLinks: number;
      errorBreakdown: Record<string, number>;
    };
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleValidate = async () => {
    if (!text.trim()) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await runToolWithAuth<
        { text: string; maxUrls?: number },
        typeof result
      >(linkValidatorPath, {
        text,
        maxUrls: 50
      });
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const getErrorIcon = (errorType?: string) => {
    switch (errorType) {
      case 'NotFound':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      case 'Forbidden':
        return <ExclamationTriangleIcon className="h-5 w-5 text-orange-500" />;
      case 'Timeout':
      case 'NetworkError':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />;
      default:
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
    }
  };

  const getErrorMessage = (validation: LinkValidation) => {
    if (!validation.error) return 'Link is accessible';
    
    switch (validation.error.type) {
      case 'NotFound':
        return 'Page not found (404)';
      case 'Forbidden':
        return 'Access forbidden (403) - Site may block automated access';
      case 'Timeout':
        return 'Request timed out';
      case 'NetworkError':
        return validation.error.message || 'Network error';
      case 'ServerError':
        return `Server error (${validation.error.statusCode})`;
      case 'RateLimited':
        return 'Rate limited (429)';
      default:
        return validation.error.message || validation.error.type;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Link href="/tools" className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-6">
        <ChevronLeftIcon className="h-4 w-4 mr-1" />
        Back to Tools
      </Link>
      
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Link Validator</h1>
        <p className="text-gray-600">
          Extract and validate all external links in your document. Check for broken links, 
          access restrictions, and network issues.
        </p>
      </div>

      <div className="space-y-6">
        <div>
          <label htmlFor="text" className="block text-sm font-medium text-gray-700 mb-2">
            Enter document text
          </label>
          <textarea
            id="text"
            rows={10}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            placeholder="Paste your document text here. The tool will find all URLs including markdown links [like this](https://example.com), HTML links, and plain URLs..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="mt-2 space-y-1">
            <p className="text-sm text-gray-600">Try an example:</p>
            <div className="flex flex-wrap gap-2">
              {exampleTexts.map((example, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setText(example.content)}
                  className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-md border border-gray-300 transition-colors"
                >
                  {example.title}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={handleValidate}
          disabled={isLoading || !text.trim()}
          className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          <LinkIcon className="h-4 w-4 mr-2" />
          {isLoading ? 'Validating Links...' : 'Validate Links'}
        </button>

        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {result && (
          <div className="space-y-6">
            {/* Summary Statistics */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Summary</h2>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{result.summary.totalLinks}</div>
                  <div className="text-sm text-gray-600">Total Links</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{result.summary.workingLinks}</div>
                  <div className="text-sm text-gray-600">Working</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{result.summary.brokenLinks}</div>
                  <div className="text-sm text-gray-600">Broken</div>
                </div>
              </div>

              {result.summary.brokenLinks > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <div className="text-sm text-gray-600">
                    <p className="font-medium mb-2">Error Breakdown:</p>
                    <div className="space-y-1">
                      {Object.entries(result.summary.errorBreakdown).map(([type, count]) => (
                        <div key={type} className="flex justify-between">
                          <span>{type}:</span>
                          <span className="font-medium">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Link Details */}
            {result.validations.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-medium text-gray-900">Link Details</h2>
                {result.validations.map((validation, index) => (
                  <div key={index} className="bg-white shadow rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      {getErrorIcon(validation.error?.type)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 break-all">
                          {validation.url}
                        </p>
                        {validation.finalUrl && validation.finalUrl !== validation.url && (
                          <p className="text-sm text-gray-500 mt-1 break-all">
                            → Redirects to: {validation.finalUrl}
                          </p>
                        )}
                        <p className={`text-sm mt-2 ${validation.accessible ? 'text-green-600' : 'text-red-600'}`}>
                          {getErrorMessage(validation)}
                        </p>
                        {validation.details && (
                          <p className="text-xs text-gray-500 mt-1">
                            Status: {validation.details.statusCode} • Content-Type: {validation.details.contentType}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {result.urls.length === 0 && (
              <div className="bg-gray-50 rounded-lg p-6 text-center">
                <p className="text-gray-600">No URLs found in the document.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}