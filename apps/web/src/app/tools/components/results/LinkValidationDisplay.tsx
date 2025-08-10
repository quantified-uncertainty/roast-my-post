import React from 'react';
import { CheckCircleIcon, XCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { StatsSummary } from './StatsSummary';

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

interface LinkValidationDisplayProps {
  result: LinkValidationResult;
  title?: string;
  className?: string;
}

export function LinkValidationDisplay({ 
  result, 
  title = 'Validation Results',
  className = '' 
}: LinkValidationDisplayProps) {
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

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">{title}</h2>
        
        {/* Summary */}
        <StatsSummary
          columns={4}
          stats={[
            { label: 'Total Links', value: result.summary.total, color: 'gray' },
            { label: 'Valid', value: result.summary.valid, color: 'green' },
            { label: 'Invalid', value: result.summary.invalid, color: 'red' },
            { label: 'Warnings', value: result.summary.warnings, color: 'yellow' }
          ]}
        />

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
  );
}