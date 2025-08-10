import React from 'react';
import { CheckCircleIcon, XCircleIcon, QuestionMarkCircleIcon, ExclamationTriangleIcon, ClockIcon } from '@heroicons/react/24/outline';

export interface Claim {
  claim: string;
  verdict?: 'true' | 'false' | 'unverifiable' | 'misleading' | 'verified' | 'unverified' | 'outdated';
  confidence?: number;
  explanation?: string;
  sources?: string[];
  evidence?: string;
  type?: string;
  importance?: number;
}

interface ClaimListDisplayProps {
  claims: Claim[];
  title?: string;
  showSources?: boolean;
  showConfidence?: boolean;
  noClaimsMessage?: string;
}

const verdictConfig = {
  true: {
    icon: CheckCircleIcon,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    label: 'True'
  },
  verified: {
    icon: CheckCircleIcon,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    label: 'Verified'
  },
  false: {
    icon: XCircleIcon,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    label: 'False'
  },
  misleading: {
    icon: ExclamationTriangleIcon,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    label: 'Misleading'
  },
  unverifiable: {
    icon: QuestionMarkCircleIcon,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    label: 'Unverifiable'
  },
  unverified: {
    icon: QuestionMarkCircleIcon,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    label: 'Unverified'
  },
  outdated: {
    icon: ClockIcon,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    label: 'Outdated'
  }
} as const;

/**
 * Reusable component for displaying lists of claims with verdicts
 * Used by: fact-checker, extract-factual-claims, extract-forecasting-claims
 */
export function ClaimListDisplay({
  claims,
  title = 'Claims',
  showSources = true,
  showConfidence = true,
  noClaimsMessage = 'No claims found'
}: ClaimListDisplayProps) {
  if (!claims || claims.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
        <p className="text-gray-600">{noClaimsMessage}</p>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-lg font-medium text-gray-900 mb-4">
        {title} ({claims.length})
      </h2>
      
      <div className="space-y-4">
        {claims.map((claim, index) => {
          const verdict = claim.verdict || 'unverifiable';
          const config = verdictConfig[verdict];
          const Icon = config.icon;
          
          return (
            <div 
              key={index} 
              className={`p-4 rounded-lg border ${config.bgColor} ${config.borderColor}`}
            >
              <div className="flex items-start">
                <Icon className={`h-5 w-5 ${config.color} mt-0.5 mr-3 flex-shrink-0`} />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`font-medium ${config.color}`}>
                      {config.label}
                    </span>
                    <div className="flex items-center gap-2">
                      {showConfidence && claim.confidence !== undefined && (
                        <span className="text-sm text-gray-600">
                          {typeof claim.confidence === 'number' 
                            ? `${Math.round(claim.confidence)}% confidence`
                            : `${claim.confidence} confidence`}
                        </span>
                      )}
                      {claim.importance !== undefined && (
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          claim.importance > 70 ? 'bg-red-100 text-red-700' :
                          claim.importance > 40 ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {claim.importance > 70 ? 'High' : 
                           claim.importance > 40 ? 'Medium' : 'Low'} importance
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <p className="text-sm font-medium text-gray-900 mb-2">
                    "{claim.claim}"
                  </p>
                  
                  {claim.type && (
                    <p className="text-xs text-gray-600 mb-2">
                      Type: <span className="font-medium">{claim.type}</span>
                    </p>
                  )}
                  
                  {claim.explanation && (
                    <p className="text-sm text-gray-700 mb-2">
                      {claim.explanation}
                    </p>
                  )}
                  
                  {claim.evidence && (
                    <div className="text-sm text-gray-600 mb-2">
                      <strong>Evidence:</strong> {claim.evidence}
                    </div>
                  )}
                  
                  {showSources && claim.sources && claim.sources.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <p className="text-xs text-gray-600">
                        <strong>Sources:</strong>
                      </p>
                      <ul className="mt-1 text-xs text-blue-600">
                        {claim.sources.map((source, sIndex) => (
                          <li key={sIndex} className="truncate">
                            {source.startsWith('http') ? (
                              <a 
                                href={source} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="hover:underline"
                              >
                                {source}
                              </a>
                            ) : (
                              source
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
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