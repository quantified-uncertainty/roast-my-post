import React from 'react';
import { CheckCircleIcon, XCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

export interface ErrorItem {
  text: string;
  type?: string;
  severity?: 'critical' | 'major' | 'minor';
  correction?: string;
  description?: string;
  lineNumber?: number;
  confidence?: number;
  importance?: number;
}

interface ErrorListDisplayProps {
  errors: ErrorItem[];
  title?: string;
  noErrorsMessage?: string;
  noErrorsDescription?: string;
  showLineNumbers?: boolean;
  errorTypeName?: string;
}

const severityConfig = {
  critical: {
    icon: XCircleIcon,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-l-red-600',
  },
  major: {
    icon: ExclamationTriangleIcon,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-l-orange-600',
  },
  minor: {
    icon: ExclamationTriangleIcon,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-l-yellow-600',
  },
} as const;

/**
 * Reusable component for displaying lists of errors/issues
 * Used by: check-spelling-grammar, check-math tools, etc.
 */
export function ErrorListDisplay({
  errors,
  title = 'Errors Found',
  noErrorsMessage = 'No Errors Found',
  noErrorsDescription = 'Your text appears to be error-free.',
  showLineNumbers = true,
  errorTypeName = 'Error'
}: ErrorListDisplayProps) {
  if (!errors || errors.length === 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <div className="flex items-center">
          <CheckCircleIcon className="h-6 w-6 text-green-600 mr-3" />
          <div>
            <h3 className="text-lg font-medium text-green-900">{noErrorsMessage}</h3>
            <p className="text-sm text-green-700 mt-1">{noErrorsDescription}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-lg font-medium text-gray-900 mb-4">{title}</h2>
      <div className="space-y-4">
        {errors.map((error, index) => {
          const severity = error.severity || (
            error.importance && error.importance > 70 ? 'critical' : 
            error.importance && error.importance > 40 ? 'major' : 'minor'
          );
          const config = severityConfig[severity];
          const Icon = config.icon;
          
          return (
            <div key={index} className={`p-4 rounded-lg ${config.bgColor} border-l-4 ${config.borderColor}`}>
              <div className="flex items-start">
                <Icon className={`h-5 w-5 ${config.color} mt-0.5 mr-3 flex-shrink-0`} />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-sm font-medium ${config.color}`}>
                      {error.type ? `${error.type} ${errorTypeName}` : errorTypeName}
                    </span>
                    <div className="flex items-center gap-2">
                      {error.confidence && (
                        <span className={`text-xs px-2 py-1 rounded-full ${config.bgColor} ${config.color}`}>
                          {Math.round(error.confidence * 100)}% confidence
                        </span>
                      )}
                      <span className={`text-xs px-2 py-1 rounded-full ${config.bgColor} ${config.color}`}>
                        {severity}
                      </span>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-700 mb-2">
                    <strong>Found:</strong> "{error.text}"
                  </p>
                  
                  {error.correction && (
                    <p className="text-sm text-gray-700 mb-2">
                      <strong>Suggestion:</strong> "{error.correction}"
                    </p>
                  )}
                  
                  {error.description && (
                    <p className="text-sm text-gray-600 italic">{error.description}</p>
                  )}
                  
                  {showLineNumbers && error.lineNumber && (
                    <p className="text-xs text-gray-500 mt-2">
                      Line: {error.lineNumber}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}