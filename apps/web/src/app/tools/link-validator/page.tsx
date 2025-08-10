'use client';

import { useState } from 'react';
import { LinkIcon, CheckCircleIcon, XCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { toolSchemas, getToolReadme } from '@roast/ai';
import { runToolWithAuth } from '@/app/tools/utils/runToolWithAuth';
import { TabbedToolPageLayout } from '../components/TabbedToolPageLayout';
import { ToolDocumentation } from '../components/ToolDocumentation';

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

export default function LinkValidatorPage() {
  const [text, setText] = useState('');
  const [checkExternal, setCheckExternal] = useState(true);
  const [followRedirects, setFollowRedirects] = useState(true);
  const [result, setResult] = useState<LinkValidationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Get schemas from centralized registry
  const { inputSchema, outputSchema } = toolSchemas['link-validator' as keyof typeof toolSchemas];

  const handleValidate = async () => {
    if (!text.trim()) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await runToolWithAuth<{ text: string; checkExternal?: boolean; followRedirects?: boolean }, LinkValidationResult>(
        '/api/tools/link-validator', 
        { text, checkExternal, followRedirects }
      );
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const exampleText = `Check out these resources:
- Official documentation: https://docs.example.com/guide
- GitHub repository: https://github.com/example/project
- Blog post: https://blog.example.com/2024/introduction
- Broken link: https://notarealwebsite12345.com/page
- Another resource: https://wikipedia.org/wiki/Machine_learning`;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'valid':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'invalid':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'valid':
        return 'bg-green-50 border-green-200';
      case 'invalid':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  // Try tab content
  const tryContent = (
    <div className="space-y-6">
      <form onSubmit={(e) => { e.preventDefault(); handleValidate(); }} className="space-y-6 bg-white p-6 rounded-lg shadow-sm border">
        <div>
          <label htmlFor="text" className="block text-sm font-medium text-gray-700 mb-1">
            Text with URLs <span className="text-red-500">*</span>
          </label>
          <textarea
            id="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            rows={8}
            placeholder="Enter text containing URLs to validate..."
            required
          />
          <button
            type="button"
            onClick={() => setText(exampleText)}
            className="mt-2 text-sm text-indigo-600 hover:text-indigo-500"
          >
            Load example text with links
          </button>
        </div>

        <div className="space-y-3">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={checkExternal}
              onChange={(e) => setCheckExternal(e.target.checked)}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700">Check external links (makes HTTP requests)</span>
          </label>
          
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={followRedirects}
              onChange={(e) => setFollowRedirects(e.target.checked)}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700">Follow redirects</span>
          </label>
        </div>

        <button
          type="submit"
          disabled={isLoading || !text.trim()}
          className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Validating Links...' : 'Validate Links'}
        </button>
      </form>

      {error && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-800">Error: {error}</p>
        </div>
      )}

      {result && (
        <div className="mt-8 space-y-6">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Validation Results</h2>
            
            {/* Summary */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="text-center p-3 bg-gray-50 rounded">
                <p className="text-2xl font-bold text-gray-900">{result.summary.total}</p>
                <p className="text-sm text-gray-600">Total Links</p>
              </div>
              <div className="text-center p-3 bg-green-50 rounded">
                <p className="text-2xl font-bold text-green-600">{result.summary.valid}</p>
                <p className="text-sm text-gray-600">Valid</p>
              </div>
              <div className="text-center p-3 bg-red-50 rounded">
                <p className="text-2xl font-bold text-red-600">{result.summary.invalid}</p>
                <p className="text-sm text-gray-600">Invalid</p>
              </div>
              <div className="text-center p-3 bg-yellow-50 rounded">
                <p className="text-2xl font-bold text-yellow-600">{result.summary.warnings}</p>
                <p className="text-sm text-gray-600">Warnings</p>
              </div>
            </div>

            {/* Link Details */}
            <div className="space-y-3">
              <h3 className="font-medium text-gray-900">Link Details:</h3>
              {result.links.map((link, index) => (
                <div key={index} className={`border rounded-lg p-4 ${getStatusColor(link.status)}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      {getStatusIcon(link.status)}
                      <div className="flex-1">
                        <a 
                          href={link.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm font-mono text-blue-600 hover:text-blue-800 break-all"
                        >
                          {link.url}
                        </a>
                        
                        <div className="mt-2 space-y-1 text-xs text-gray-600">
                          {link.statusCode && (
                            <p><span className="font-medium">Status Code:</span> {link.statusCode}</p>
                          )}
                          {link.contentType && (
                            <p><span className="font-medium">Content Type:</span> {link.contentType}</p>
                          )}
                          {link.redirectUrl && (
                            <p><span className="font-medium">Redirects to:</span> {link.redirectUrl}</p>
                          )}
                          {link.responseTime && (
                            <p><span className="font-medium">Response Time:</span> {link.responseTime}ms</p>
                          )}
                          {link.error && (
                            <p className="text-red-600"><span className="font-medium">Error:</span> {link.error}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // README content from generated file
  const readmeContent = getToolReadme('link-validator');

  // Docs tab content
  const docsContent = (
    <ToolDocumentation 
      toolId="link-validator"
      inputSchema={inputSchema}
      outputSchema={outputSchema}
      readmeContent={readmeContent}
    />
  );

  return (
    <TabbedToolPageLayout
      title="Link Validator"
      description="Extract and validate URLs from text, checking their accessibility and status"
      icon={<LinkIcon className="h-8 w-8 text-indigo-600" />}
      tryContent={tryContent}
      docsContent={docsContent}
    />
  );
}