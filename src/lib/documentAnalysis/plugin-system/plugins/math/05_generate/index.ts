/**
 * Math comment generation utilities
 */

import type { Comment } from "@/types/documentSchema";

import { severityToImportance } from "../../../utils/findingHelpers";
import type { LocatedFinding } from "../../MathPlugin.types";

/**
 * Convert located findings to UI comments
 */
// TODO: It needs to get the highlights!!! This should come from the previous stage.
export function generateMathComments(
  locatedFindings: LocatedFinding[]
): Comment[] {
  return locatedFindings.map((finding) => ({
    description: finding.message,
    importance: severityToImportance(finding.severity),
    highlight: {
      startOffset: 0, // This would need to be calculated from locationHint
      endOffset: 0, // This would need to be calculated from locationHint
      quotedText: finding.locationHint.matchText,
      isValid: true,
    },
    isValid: true,
  }));
}

/**
 * Calculate character offset from line number and position
 */
function calculateCharOffsetFromLineNumber(
  documentText: string,
  lineNumber: number,
  matchText: string
): { startOffset: number; endOffset: number } | null {
  const lines = documentText.split("\n");
  let charOffset = 0;

  // Calculate offset to start of target line
  for (let i = 0; i < lineNumber - 1 && i < lines.length; i++) {
    charOffset += lines[i].length + 1; // +1 for newline
  }

  // Find the exact position within the line
  const lineText = lines[lineNumber - 1] || "";
  const positionInLine = lineText.indexOf(matchText);

  if (positionInLine === -1) {
    return null;
  }

  charOffset += positionInLine;
  return {
    startOffset: charOffset,
    endOffset: charOffset + matchText.length,
  };
}

/**
 * Convert located findings to comments with proper offsets
 * This requires the original document text to calculate character offsets
 */
export function generateMathCommentsWithOffsets(
  locatedFindings: LocatedFinding[],
  documentText: string
): Comment[] {
  return locatedFindings.map((finding) => {
    // If we already have highlight information from the locator, use it
    if (finding.highlight) {
      return {
        description: finding.message,
        importance: severityToImportance(finding.severity),
        highlight: {
          ...finding.highlight,
          isValid: true,
        },
        isValid: true,
      };
    }

    // Fallback: Calculate character offset from line number
    const offsets = calculateCharOffsetFromLineNumber(
      documentText,
      finding.locationHint.lineNumber,
      finding.locationHint.matchText
    );

    if (!offsets) {
      // If we can't find the position, return with invalid highlight
      return {
        description: finding.message,
        importance: severityToImportance(finding.severity),
        highlight: {
          startOffset: 0,
          endOffset: 0,
          quotedText: finding.locationHint.matchText,
          isValid: false,
        },
        isValid: true,
      };
    }

    return {
      description: finding.message,
      importance: severityToImportance(finding.severity),
      highlight: {
        startOffset: offsets.startOffset,
        endOffset: offsets.endOffset,
        quotedText: finding.locationHint.matchText,
        isValid: true,
      },
      isValid: true,
    };
  });
}
