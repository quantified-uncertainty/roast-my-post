/**
 * Convert plugin findings with location hints into proper highlights
 */

import { Finding } from '../types';
import { Comment } from '@/types/documentSchema';
import { LocationUtils } from '../../utils/LocationUtils';
import { logger } from '@/lib/logger';

export interface FindingToHighlightOptions {
  documentText: string;
  defaultImportance?: number;
}

/**
 * Convert a plugin finding with location hints into a Comment with highlight
 */
export function convertFindingToHighlight(
  finding: Finding,
  options: FindingToHighlightOptions
): Comment | null {
  const { documentText, defaultImportance = 3 } = options;
  
  // Only process findings with location hints
  if (!finding.locationHint?.matchText) {
    logger.debug('Finding has no location hint or match text, skipping highlight conversion');
    return null;
  }

  const locationUtils = new LocationUtils(documentText);
  const { matchText, lineNumber, startLineNumber, endLineNumber } = finding.locationHint;

  // Determine the line range to search
  let searchStartLine = lineNumber || startLineNumber;
  let searchEndLine = lineNumber || endLineNumber || searchStartLine;
  
  if (!searchStartLine) {
    logger.warn('Finding has no line number information, cannot create highlight');
    return null;
  }

  // Try to find the text within the specified line range (with some tolerance)
  const lineRangeTolerance = 2; // Search 2 lines before and after
  const actualStartLine = Math.max(1, searchStartLine - lineRangeTolerance);
  const actualEndLine = Math.max(searchStartLine, searchEndLine || searchStartLine) + lineRangeTolerance;
  
  const locationResult = locationUtils.findTextInLineRange(
    matchText,
    actualStartLine,
    actualEndLine
  );

  if (!locationResult) {
    logger.warn(
      `Could not find text "${matchText}" in lines ${actualStartLine}-${actualEndLine} for finding: ${finding.message}`
    );
    return null;
  }

  // Map severity to importance (1-10 scale)
  const importanceMap = {
    'info': 2,
    'low': 3,
    'medium': 5,
    'high': 8
  };
  const importance = importanceMap[finding.severity] || defaultImportance;

  // Create the Comment object
  const comment: Comment = {
    description: finding.message,
    importance,
    highlight: {
      startOffset: locationResult.startOffset,
      endOffset: locationResult.endOffset,
      quotedText: matchText,
      isValid: true,
      prefix: locationUtils.getContextSnippet(locationResult.startOffset, 30, 0),
    },
    isValid: true,
  };

  // Add grade if it makes sense based on severity
  // Convert letter grades to numeric grades that match the database schema
  if (finding.severity === 'high') {
    (comment as Comment & { grade?: number }).grade = 65; // D grade (60-69 range)
  } else if (finding.severity === 'medium') {
    (comment as Comment & { grade?: number }).grade = 75; // C grade (70-79 range)
  }

  return comment;
}

/**
 * Convert multiple findings to highlights, filtering out any that can't be converted
 */
export function convertFindingsToHighlights(
  findings: Finding[],
  documentText: string,
  defaultImportance?: number
): Comment[] {
  const highlights: Comment[] = [];
  
  for (const finding of findings) {
    const highlight = convertFindingToHighlight(finding, {
      documentText,
      defaultImportance
    });
    
    if (highlight) {
      highlights.push(highlight);
    }
  }

  logger.info(
    `Converted ${highlights.length} of ${findings.length} findings to highlights`
  );
  
  return highlights;
}

/**
 * Filter findings to only those with valid location hints
 */
export function filterFindingsWithLocationHints(findings: Finding[]): Finding[] {
  return findings.filter(f => 
    f.locationHint && 
    f.locationHint.matchText && 
    (f.locationHint.lineNumber || f.locationHint.startLineNumber)
  );
}