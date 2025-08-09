'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CheckCircleIcon, XCircleIcon, ExclamationTriangleIcon, LinkIcon, ChevronLeftIcon } from '@heroicons/react/24/solid';
import { runToolWithAuth } from '@/app/tools/utils/runToolWithAuth';
import MarkdownRenderer from '@/components/MarkdownRenderer';

// Type definitions that were imported from server
type LinkAnalysis = {
  url: string;
  status: 'accessible' | 'redirect' | 'broken' | 'error';
  statusCode?: number;
  finalUrl?: string;
  error?: string;
  timestamp: Date;
};

// Hardcode the path since we can't import from server in client components
const linkValidatorPath = '/api/tools/link-validator';

// Client-side replacement for generateLinkAnalysisAndSummary
function generateLinkAnalysisAndSummary(links: LinkAnalysis[], documentType: string) {
  const total = links.length;
  const accessible = links.filter(l => l.status === 'accessible').length;
  const redirects = links.filter(l => l.status === 'redirect').length;
  const broken = links.filter(l => l.status === 'broken' || l.status === 'error').length;
  
  const grade = total > 0 ? Math.round((accessible / total) * 100) : 100;
  
  const analysis = `## Link Validation Report

**${documentType} Analysis**
- Total links: ${total}
- Accessible: ${accessible}
- Redirects: ${redirects}
- Broken/Errors: ${broken}

### Details
${links.map(link => {
  let statusEmoji = link.status === 'accessible' ? '✅' : 
                    link.status === 'redirect' ? '↪️' : '❌';
  return `${statusEmoji} ${link.url}${link.finalUrl && link.finalUrl !== link.url ? ` → ${link.finalUrl}` : ''}${link.error ? ` (${link.error})` : ''}`;
}).join('\n')}`;

  const summary = `Checked ${total} links: ${accessible} accessible, ${redirects} redirects, ${broken} broken. Grade: ${grade}%`;
  
  return { analysis, summary, grade };
}

interface LinkValidation {
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
  const [analysis, setAnalysis] = useState<{ analysis: string; summary: string; grade: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleValidate = async () => {
    if (!text.trim()) return;

    setIsLoading(true);
    setError(null);
    setResult(null);
    setAnalysis(null);

    try {
      const response = await runToolWithAuth<
        { text: string; maxUrls?: number },
        typeof result
      >(linkValidatorPath, {
        text,
        maxUrls: 50
      });
      setResult(response);

      // Convert validations to LinkAnalysis format for the analysis generator
      const linkAnalysisResults: LinkAnalysis[] = response!.validations.map(validation => ({
        url: validation.url,
        finalUrl: validation.finalUrl,
        timestamp: new Date(validation.timestamp),
        accessError: validation.error ? {
          type: validation.error.type as any,
          ...(validation.error.message && { message: validation.error.message }),
          ...(validation.error.statusCode && { statusCode: validation.error.statusCode }),
        } : undefined,
        linkDetails: validation.details ? {
          contentType: validation.details.contentType,
          statusCode: validation.details.statusCode,
        } : undefined,
      }));

      // Generate the analysis and summary
      const analysisResult = generateLinkAnalysisAndSummary(linkAnalysisResults, "Document");
      setAnalysis(analysisResult);
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

            {/* Analysis Output Section */}
            {analysis && (
              <div className="space-y-4">
                <h2 className="text-lg font-medium text-gray-900">Analysis Output</h2>
                
                {/* Summary */}
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <h3 className="text-sm font-semibold text-blue-900 mb-2">Summary</h3>
                  <p className="text-sm text-blue-800">{analysis.summary}</p>
                </div>

                {/* Grade */}
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-900">Document Reliability Score</h3>
                    <div className={`text-2xl font-bold ${
                      analysis.grade >= 80 ? 'text-green-600' : 
                      analysis.grade >= 60 ? 'text-yellow-600' : 
                      'text-red-600'
                    }`}>
                      {analysis.grade}%
                    </div>
                  </div>
                </div>

                {/* Full Analysis */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <MarkdownRenderer className="prose prose-sm max-w-none">
                    {analysis.analysis}
                  </MarkdownRenderer>
                </div>
              </div>
            )}

            {/* Raw JSON Output Section */}
            <div className="space-y-4">
              <h2 className="text-lg font-medium text-gray-900">Raw JSON Output</h2>
              <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                <pre className="text-sm text-gray-100">
                  <code>{JSON.stringify(result, null, 2)}</code>
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}