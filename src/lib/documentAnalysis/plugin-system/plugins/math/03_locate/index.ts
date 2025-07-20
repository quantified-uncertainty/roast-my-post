/**
 * Math location utilities
 */

import type { InvestigatedFinding, LocatedFinding, ErrorData } from '../../MathPlugin.types';
import { findMathLocation } from '../../../utils/mathLocationFinder';
import { getLineNumberAtPosition, getLineAtPosition } from '../../../utils/textHelpers';
import { logger } from '../../../../../logger';

export interface LocationResult {
  located: LocatedFinding[];
  dropped: number;
}

/**
 * Locate math findings in document text
 */
export function locateMathFindings(
  investigatedFindings: InvestigatedFinding[],
  documentText: string
): LocationResult {
  const located: LocatedFinding[] = [];
  let dropped = 0;

  for (const finding of investigatedFindings) {
    const data = finding.data;

    // Try math-specific location finding
    const highlight = findMathLocation(
      finding.highlightHint.searchText,
      documentText,
      { allowNormalization: true }
    );

    if (highlight) {
      // Successfully located with direct search
      located.push(createLocatedFinding(finding, highlight, documentText));
    } else {
      // Try fallback with surrounding text
      const fallbackResult = tryFallbackLocation(finding, data, documentText);
      
      if (fallbackResult) {
        located.push(fallbackResult);
      } else {
        dropped++;
        logger.warn(
          `MathPlugin: Failed to locate equation: "${data.equation}"`,
          { surroundingText: data.surroundingText }
        );
      }
    }
  }

  if (dropped > 0) {
    logger.info(
      `MathPlugin: Dropped ${dropped} findings that couldn't be located`
    );
  }

  return { located, dropped };
}

/**
 * Create a located finding from investigation result
 */
function createLocatedFinding(
  finding: InvestigatedFinding,
  highlight: { startOffset: number; endOffset: number; quotedText: string },
  documentText: string
): LocatedFinding {
  return {
    type: finding.type,
    severity: finding.severity,
    message: finding.message,
    metadata: finding.data,
    locationHint: {
      lineNumber: getLineNumberAtPosition(documentText, highlight.startOffset),
      lineText: getLineAtPosition(documentText, highlight.startOffset),
      matchText: highlight.quotedText,
    },
    highlight, // Store the highlight information
  };
}

/**
 * Try to locate finding using surrounding text as fallback
 */
function tryFallbackLocation(
  finding: InvestigatedFinding,
  data: ErrorData,
  documentText: string
): LocatedFinding | null {
  if (!data.surroundingText) {
    return null;
  }

  const contextPos = documentText.indexOf(data.surroundingText);
  if (contextPos === -1) {
    return null;
  }

  const equationInContext = data.surroundingText.indexOf(data.equation);
  if (equationInContext === -1) {
    return null;
  }

  const startOffset = contextPos + equationInContext;
  const endOffset = startOffset + data.equation.length;

  return {
    type: finding.type,
    severity: finding.severity,
    message: finding.message,
    metadata: finding.data,
    locationHint: {
      lineNumber: getLineNumberAtPosition(documentText, startOffset),
      lineText: getLineAtPosition(documentText, startOffset),
      matchText: data.equation,
    },
    highlight: {
      startOffset,
      endOffset,
      quotedText: data.equation,
    },
  };
}