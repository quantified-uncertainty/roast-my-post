import { CheckCircleIcon, XCircleIcon, ExclamationTriangleIcon, InformationCircleIcon } from '@heroicons/react/24/outline';

/**
 * Common utility functions for formatting and displaying results across tool pages
 */

// Severity levels and their corresponding styles
export const severityConfig = {
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
  info: {
    icon: InformationCircleIcon,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-l-blue-600',
  },
} as const;

// Color mappings for different score ranges
export function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-yellow-600';
  if (score >= 40) return 'text-orange-600';
  return 'text-red-600';
}

export function getScoreBackgroundColor(score: number): string {
  if (score >= 80) return 'bg-green-50';
  if (score >= 60) return 'bg-yellow-50';
  if (score >= 40) return 'bg-orange-50';
  return 'bg-red-50';
}

// Icon mappings for scores
export function getScoreIcon(score: number) {
  if (score >= 70) return CheckCircleIcon;
  if (score >= 40) return ExclamationTriangleIcon;
  return XCircleIcon;
}

// Severity color mappings (for spelling/grammar/math errors)
export function getSeverityColor(severity?: string): string {
  const colors: Record<string, string> = {
    'critical': 'bg-red-100 text-red-800',
    'major': 'bg-orange-100 text-orange-800',
    'minor': 'bg-yellow-100 text-yellow-800',
    'info': 'bg-blue-100 text-blue-800',
  };
  return colors[severity || ''] || 'bg-gray-100 text-gray-800';
}

// Status colors for validation results
export function getStatusColor(status: string): string {
  switch (status) {
    case 'valid':
    case 'success':
    case 'correct':
      return 'bg-green-50 border-green-200';
    case 'invalid':
    case 'error':
    case 'incorrect':
      return 'bg-red-50 border-red-200';
    case 'warning':
    case 'partial':
      return 'bg-yellow-50 border-yellow-200';
    default:
      return 'bg-gray-50 border-gray-200';
  }
}

// Status icons
export function getStatusIcon(status: string) {
  switch (status) {
    case 'valid':
    case 'success':
    case 'correct':
      return CheckCircleIcon;
    case 'invalid':
    case 'error':
    case 'incorrect':
      return XCircleIcon;
    case 'warning':
    case 'partial':
      return ExclamationTriangleIcon;
    default:
      return InformationCircleIcon;
  }
}

// Result color for pass/fail/partial
export function getResultColor(result: string): string {
  switch (result.toLowerCase()) {
    case 'pass':
    case 'correct':
    case 'valid':
      return 'text-green-600';
    case 'fail':
    case 'incorrect':
    case 'invalid':
      return 'text-red-600';
    case 'partial':
    case 'warning':
      return 'text-yellow-600';
    default:
      return 'text-gray-600';
  }
}

// Convention colors for language detection
export function getConventionColor(convention: string): string {
  const colors: Record<string, string> = {
    'american': 'bg-blue-100 text-blue-800',
    'us': 'bg-blue-50 border-blue-200 text-blue-800',
    'british': 'bg-purple-100 text-purple-800',
    'uk': 'bg-red-50 border-red-200 text-red-800',
    'mixed': 'bg-yellow-100 text-yellow-800',
    'unknown': 'bg-gray-100 text-gray-800',
  };
  return colors[convention.toLowerCase()] || 'bg-gray-50 border-gray-200 text-gray-800';
}

// Consensus colors for forecasting
export function getConsensusColor(consensus: string): string {
  switch (consensus.toLowerCase()) {
    case 'strong agreement':
      return 'text-green-600';
    case 'moderate agreement':
      return 'text-yellow-600';
    case 'disagreement':
      return 'text-red-600';
    default:
      return 'text-gray-600';
  }
}

// Relevance colors for search/research results
export const relevanceColors = {
  high: 'bg-green-100 text-green-800 border-green-200',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  low: 'bg-gray-100 text-gray-800 border-gray-200',
} as const;

// Format percentage with appropriate color
export function formatPercentage(value: number, inverse = false): { text: string; color: string } {
  const percentage = Math.round(value);
  const text = `${percentage}%`;
  
  // For inverse, lower is better (like error rates)
  const score = inverse ? 100 - percentage : percentage;
  const color = getScoreColor(score);
  
  return { text, color };
}

// Format confidence score
export function formatConfidence(confidence: number): { text: string; label: string; color: string } {
  const percentage = Math.round(confidence * 100);
  let label: string;
  
  if (percentage >= 90) label = 'Very High';
  else if (percentage >= 70) label = 'High';
  else if (percentage >= 50) label = 'Moderate';
  else if (percentage >= 30) label = 'Low';
  else label = 'Very Low';
  
  return {
    text: `${percentage}%`,
    label,
    color: getScoreColor(percentage)
  };
}