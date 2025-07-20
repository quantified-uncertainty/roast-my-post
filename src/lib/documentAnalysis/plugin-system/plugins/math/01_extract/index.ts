/**
 * Math extraction utilities
 */

import type { PotentialFinding } from '../../MathPlugin.types';
import { generateFindingId } from '../../../utils/findingHelpers';

export interface MathExtractionResult {
  id: string;
  text: string;
  equation: string;
  context: string;
  isCorrect: boolean;
  error?: string;
  surroundingText?: string;
}

/**
 * Convert extracted math results to potential findings
 */
export function convertToFindings(
  results: MathExtractionResult[],
  chunkId: string,
  pluginName: string
): PotentialFinding[] {
  const findings: PotentialFinding[] = [];

  results.forEach((result) => {
    const equationText = result.equation || result.text;

    if (!result.isCorrect && result.error) {
      findings.push({
        id: generateFindingId(pluginName, "math-error"),
        type: "math_error",
        data: {
          equation: equationText,
          error: result.error,
          context: result.context,
          surroundingText: result.surroundingText,
        },
        highlightHint: {
          searchText: equationText,
          chunkId: chunkId,
          lineNumber: undefined,
        },
      });
    } else if (result.isCorrect) {
      findings.push({
        id: generateFindingId(pluginName, "math-correct"),
        type: "math_correct",
        data: {
          equation: equationText,
          context: result.context,
          surroundingText: result.surroundingText,
        },
        highlightHint: {
          searchText: equationText,
          chunkId: chunkId,
          lineNumber: undefined,
        },
      });
    }
  });

  return findings;
}