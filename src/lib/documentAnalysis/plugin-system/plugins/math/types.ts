/**
 * Types for Math Plugin
 */

import type {
  GenericPotentialFinding,
  GenericInvestigatedFinding,
  GenericLocatedFinding,
} from "../../utils/pluginHelpers";
import type { ExtractionConfig } from "../../utils/extractionHelper";

// Math extraction result interface
export interface MathExtractionResult {
  equation: string;
  isCorrect: boolean;
  error?: string;
  surroundingText?: string;
  context?: string;
}

// Plugin state interface
export interface MathFindingStorage {
  potential: GenericPotentialFinding[];
  investigated: GenericInvestigatedFinding[];
  located: GenericLocatedFinding[];
  summary?: string;
  analysisSummary?: string;
}

/**
 * Get extraction configuration for math plugin
 */
export function getMathExtractionConfig(pluginName: string): Omit<ExtractionConfig, 'extractionPrompt'> {
  return {
    toolName: "report_math_content",
    toolDescription: "Report mathematical content found in the text",
    toolSchema: {
      type: "object",
      properties: {
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              equation: {
                type: "string",
                description: "The mathematical expression EXACTLY as it appears in the text (preserve all spacing and formatting)",
              },
              isCorrect: {
                type: "boolean",
                description: "Whether the math is correct",
              },
              error: {
                type: "string",
                description: "Error description if incorrect",
              },
              surroundingText: {
                type: "string",
                description: "10-20 words of text surrounding the equation for context",
              },
            },
            required: ["equation", "isCorrect"],
            additionalProperties: false
          }
        }
      },
      required: ["items"],
      additionalProperties: false
    },
    pluginName
  };
}