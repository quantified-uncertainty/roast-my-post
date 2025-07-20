/**
 * Math investigation utilities
 */

import type { PotentialFinding, InvestigatedFinding } from '../../MathPlugin.types';

/**
 * Investigate math findings and add severity/messages
 */
export function investigateMathFindings(
  potentialFindings: PotentialFinding[]
): InvestigatedFinding[] {
  const investigated: InvestigatedFinding[] = [];
  
  // Only investigate error findings (not correct equations)
  const errorFindings = potentialFindings.filter(
    (f) => f.type === "math_error"
  );
  
  errorFindings.forEach((finding) => {
    investigated.push({
      id: finding.id,
      type: "math_error" as const,
      data: finding.data,
      severity: determineSeverity(finding.data.error),
      message: createErrorMessage(finding.data),
      highlightHint: finding.highlightHint,
    });
  });
  
  return investigated;
}

/**
 * Determine severity based on error type
 */
export function determineSeverity(error: string): 'low' | 'medium' | 'high' {
  const lowerError = error.toLowerCase();
  
  // High severity: fundamental arithmetic errors
  if (lowerError.includes('basic arithmetic') || 
      lowerError.includes('simple calculation')) {
    return 'high';
  }
  
  // Low severity: rounding or approximation issues
  if (lowerError.includes('rounding') || 
      lowerError.includes('approximation')) {
    return 'low';
  }
  
  // Default to medium
  return 'medium';
}

/**
 * Create a clear error message
 */
export function createErrorMessage(data: {
  equation: string;
  error: string;
  context?: string;
}): string {
  return `Mathematical error in "${data.equation}": ${data.error}`;
}