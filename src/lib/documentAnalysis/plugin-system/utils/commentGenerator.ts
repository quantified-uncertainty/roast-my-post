/**
 * Utility functions for generating comments from findings
 */

import type { Comment } from '@/types/documentSchema';
import type { InvestigatedFinding, LocatedFinding } from '../types';
import type { GenerateCommentsContext } from '../deprecated-types';
import { findTextLocation } from './locationFinder';
import { severityToImportance, sortByImportance } from './findingHelpers';
import { logger } from '../../../logger';

export interface CommentGenerationOptions {
  maxComments?: number;
  minImportance?: number;
  requireHighConfidence?: boolean;
  fuzzyMatch?: boolean;
}

/**
 * Generate comments from investigated findings
 */
export function generateCommentsFromFindings(
  findings: InvestigatedFinding[],
  context: GenerateCommentsContext,
  options?: CommentGenerationOptions
): {
  comments: Comment[];
  located: LocatedFinding[];
  dropped: number;
} {
  const {
    maxComments = 50,
    minImportance = 2,
    requireHighConfidence = false,
    fuzzyMatch = true
  } = { ...context, ...options };
  
  const comments: Comment[] = [];
  const located: LocatedFinding[] = [];
  let dropped = 0;
  
  // Sort by importance first
  const sortedFindings = sortByImportance(findings);
  
  for (const finding of sortedFindings) {
    // Stop if we've reached max comments
    if (comments.length >= maxComments) {
      dropped += sortedFindings.length - sortedFindings.indexOf(finding);
      break;
    }
    
    // Check importance threshold
    const importance = severityToImportance(finding.severity);
    if (importance < minImportance) {
      dropped++;
      continue;
    }
    
    // Try to locate the finding
    const result = findTextLocation(
      finding.highlightHint.searchText,
      context.documentText,
      {
        lineNumber: finding.highlightHint.lineNumber,
        fuzzyMatch
      }
    );
    
    if (!result.highlight) {
      dropped++;
      logger.debug(`Failed to locate finding: ${finding.id}`, {
        searchText: finding.highlightHint.searchText,
        type: finding.type
      });
      continue;
    }
    
    if (requireHighConfidence && result.confidence < 0.9) {
      dropped++;
      logger.debug(`Low confidence location for finding: ${finding.id}`, {
        confidence: result.confidence,
        searchText: finding.highlightHint.searchText
      });
      continue;
    }
    
    // Create located finding
    const locatedFinding: LocatedFinding = {
      ...finding,
      locationHint: {
        lineNumber: getLineNumberAtPosition(context.documentText, result.highlight.startOffset),
        lineText: getLineAtPosition(context.documentText, result.highlight.startOffset),
        matchText: result.highlight.quotedText,
      }
    };
    located.push(locatedFinding);
    
    // Create comment
    comments.push({
      description: finding.message,
      importance,
      highlight: result.highlight,
      isValid: true
    });
  }
  
  return { comments, located, dropped };
}

/**
 * Convert already-located findings to comments
 */
export function convertLocatedToComments(
  findings: LocatedFinding[],
  options?: {
    maxComments?: number;
    minImportance?: number;
  }
): Comment[] {
  const { maxComments = 50, minImportance = 2 } = options || {};
  
  return findings
    .filter(f => severityToImportance(f.severity) >= minImportance)
    .sort((a, b) => severityToImportance(b.severity) - severityToImportance(a.severity))
    .slice(0, maxComments)
    .map(finding => ({
      description: finding.message,
      importance: severityToImportance(finding.severity),
      highlight: {
        startOffset: finding.locationHint.lineNumber, // This would need proper conversion
        endOffset: finding.locationHint.lineNumber + finding.locationHint.matchText.length,
        quotedText: finding.locationHint.matchText,
        isValid: true
      },
      isValid: true
    }));
}

/**
 * Get line number at a character position
 */
function getLineNumberAtPosition(text: string, position: number): number {
  const lines = text.substring(0, position).split('\n');
  return lines.length;
}

/**
 * Get the line text at a character position
 */
function getLineAtPosition(text: string, position: number): string {
  const lines = text.split('\n');
  const lineNumber = getLineNumberAtPosition(text, position) - 1;
  return lines[lineNumber] || '';
}

/**
 * Filter repetitive comments (e.g., same spelling error many times)
 */
export function filterRepetitiveComments(
  comments: Comment[],
  options?: {
    maxInstancesPerError?: number;
    groupByField?: (comment: Comment) => string;
  }
): Comment[] {
  const { 
    maxInstancesPerError = 3,
    groupByField = (c: Comment) => c.highlight?.quotedText?.toLowerCase() || ''
  } = options || {};
  
  // Group comments by key
  const groups = new Map<string, Comment[]>();
  comments.forEach(comment => {
    const key = groupByField(comment);
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(comment);
  });
  
  // Filter each group
  const filtered: Comment[] = [];
  groups.forEach((group, key) => {
    if (group.length > maxInstancesPerError) {
      filtered.push(...group.slice(0, maxInstancesPerError));
      logger.debug(`Filtered ${group.length - maxInstancesPerError} repetitive instances of "${key}"`);
    } else {
      filtered.push(...group);
    }
  });
  
  // Re-sort by importance and position
  return filtered.sort((a, b) => {
    const importanceDiff = (b.importance || 0) - (a.importance || 0);
    if (importanceDiff !== 0) return importanceDiff;
    
    const aOffset = a.highlight?.startOffset || 0;
    const bOffset = b.highlight?.startOffset || 0;
    return aOffset - bOffset;
  });
}