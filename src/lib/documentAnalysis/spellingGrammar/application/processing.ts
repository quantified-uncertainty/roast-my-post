/**
 * Pure functions for error processing and deduplication
 */

import {
  SpellingGrammarError,
  ErrorGroup,
  ProcessedErrorResults,
  ConventionIssue,
  DocumentConventions
} from '../domain';
import { ErrorType, ErrorSeverity } from '../../shared/errorCategorization';

/**
 * Group similar errors together
 */
export function groupSimilarErrors(errors: SpellingGrammarError[]): Map<string, ErrorGroup> {
  const groups = new Map<string, ErrorGroup>();
  
  errors.forEach(error => {
    const key = error.getGroupKey();
    
    if (groups.has(key)) {
      const existingGroup = groups.get(key)!;
      // Keep up to 5 examples
      if (existingGroup.examples.length < 5) {
        groups.set(key, existingGroup.addExample(error));
      }
    } else {
      groups.set(key, new ErrorGroup(
        error.errorType,
        error.highlightedText,
        [error],
        error.severity
      ));
    }
  });
  
  return groups;
}

/**
 * Detect convention consistency issues
 */
export function detectConventionIssues(
  errors: SpellingGrammarError[],
  conventions: DocumentConventions
): ConventionIssue | undefined {
  // Check for mixed US/UK spelling
  const spellingErrors = errors.filter(e => e.errorType === ErrorType.SPELLING);
  const usSpellings: string[] = [];
  const ukSpellings: string[] = [];
  
  spellingErrors.forEach(error => {
    const desc = error.description.toLowerCase();
    if (desc.includes('american spelling') || desc.includes('us spelling')) {
      ukSpellings.push(error.highlightedText);
    } else if (desc.includes('british spelling') || desc.includes('uk spelling')) {
      usSpellings.push(error.highlightedText);
    }
  });
  
  if (usSpellings.length > 0 && ukSpellings.length > 0) {
    return new ConventionIssue(
      'Document contains mixed US and UK spelling conventions. Consider using one consistently throughout.',
      [...new Set([...usSpellings.slice(0, 3), ...ukSpellings.slice(0, 3)])]
    );
  }
  
  // If conventions indicate mixed language but no specific examples found
  if (conventions.hasMixedConventions()) {
    return new ConventionIssue(
      'Document appears to use mixed spelling conventions. Consider standardizing to either US or UK English.',
      []
    );
  }
  
  return undefined;
}

/**
 * Process and deduplicate errors
 */
export function processErrors(
  errors: SpellingGrammarError[],
  conventions: DocumentConventions
): ProcessedErrorResults {
  // Group similar errors
  const errorGroupsMap = groupSimilarErrors(errors);
  const errorGroups = Array.from(errorGroupsMap.values());
  
  // Sort by severity and frequency
  errorGroups.sort((a, b) => {
    // First by severity (high > medium > low)
    const severityOrder = { high: 0, medium: 1, low: 2 };
    const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
    if (severityDiff !== 0) return severityDiff;
    
    // Then by frequency (more occurrences first)
    return b.count - a.count;
  });
  
  // Detect convention issues
  const conventionIssues = detectConventionIssues(errors, conventions);
  
  return new ProcessedErrorResults(errorGroups, conventionIssues);
}

/**
 * Clean error description by removing redundant phrases
 */
export function cleanErrorDescription(description: string, errorType: string): string {
  // Remove redundant error type mentions at the start
  const redundantPhrases = [
    `${errorType} error:`,
    `${errorType}:`,
    'Spelling error:',
    'Grammar error:',
    'Punctuation error:',
    'Capitalization error:',
    'Error:'
  ];
  
  let cleaned = description;
  for (const phrase of redundantPhrases) {
    if (cleaned.toLowerCase().startsWith(phrase.toLowerCase())) {
      cleaned = cleaned.substring(phrase.length).trim();
      break;
    }
  }
  
  // Capitalize first letter
  cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  
  // Add newline before suggestion if present
  if (cleaned.includes('Suggested correction:')) {
    const parts = cleaned.split('Suggested correction:');
    let firstPart = parts[0].trim();
    if (!firstPart.endsWith('.')) {
      firstPart += '.';
    }
    cleaned = firstPart + '\nSuggested correction: ' + parts[1].trim().charAt(0).toUpperCase() + parts[1].trim().slice(1);
  }
  
  return cleaned;
}

/**
 * Create error type breakdown for logging
 */
export function createErrorTypeBreakdown(errors: SpellingGrammarError[]): Record<string, number> {
  return errors.reduce((acc, error) => {
    const type = error.errorType;
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
}

/**
 * Format error breakdown for display
 */
export function formatErrorBreakdown(errorTypes: Record<string, number>): string {
  return Object.entries(errorTypes)
    .sort(([, a], [, b]) => b - a)
    .map(([type, count]) => `${count} ${type}`)
    .join(', ');
}