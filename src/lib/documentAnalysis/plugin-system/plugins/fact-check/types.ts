/**
 * Types for Fact Check Plugin
 */

import type {
  GenericPotentialFinding,
  GenericInvestigatedFinding,
  GenericLocatedFinding,
} from "../../utils/pluginHelpers";
import type { ExtractionConfig } from "../../utils/extractionHelper";

// Fact extraction result interface
export interface FactExtractionResult {
  text: string;
  topic: string;
  importance: 'high' | 'medium' | 'low';
  specificity: 'high' | 'medium' | 'low';
  context?: string;
}

// Contradiction result interface
export interface ContradictionResult {
  claim1: string;
  claim2: string;
  explanation: string;
}

// Verification result interface
export interface VerificationResult {
  claim: string;
  verified: boolean;
  explanation: string;
  confidence: 'high' | 'medium' | 'low';
}

// Plugin state interface
export interface FactCheckFindingStorage {
  potential: GenericPotentialFinding[];
  investigated: GenericInvestigatedFinding[];
  located: GenericLocatedFinding[];
  contradictions: ContradictionResult[];
  verifications: VerificationResult[];
  summary?: string;
  analysisSummary?: string;
}

/**
 * Get extraction configuration for fact extraction
 */
export function getFactExtractionConfig(pluginName: string): Omit<ExtractionConfig, 'extractionPrompt'> {
  return {
    toolName: "extract_factual_claims",
    toolDescription: "Extract factual claims from the text that can be verified",
    toolSchema: {
      type: "object",
      properties: {
        claims: {
          type: "array",
          items: {
            type: "object",
            properties: {
              text: {
                type: "string",
                description: "The factual claim EXACTLY as it appears in the text"
              },
              topic: {
                type: "string",
                description: "The general topic/category of the claim (e.g., 'economics', 'history', 'science')"
              },
              importance: {
                type: "string",
                enum: ["high", "medium", "low"],
                description: "How important/central this claim is to the argument"
              },
              specificity: {
                type: "string",
                enum: ["high", "medium", "low"],
                description: "How specific and verifiable the claim is"
              },
              context: {
                type: "string",
                description: "Additional context around the claim if needed"
              }
            },
            required: ["text", "topic", "importance", "specificity"],
            additionalProperties: false
          }
        }
      },
      required: ["claims"],
      additionalProperties: false
    },
    pluginName
  };
}

/**
 * Get extraction configuration for contradiction detection
 */
export function getContradictionDetectionConfig(pluginName: string): Omit<ExtractionConfig, 'extractionPrompt'> {
  return {
    toolName: "detect_contradictions",
    toolDescription: "Detect contradictions between factual claims",
    toolSchema: {
      type: "object",
      properties: {
        contradictions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              claim1: {
                type: "string",
                description: "The first claim in the contradiction"
              },
              claim2: {
                type: "string",
                description: "The second claim that contradicts the first"
              },
              explanation: {
                type: "string",
                description: "Brief explanation of why these claims contradict"
              }
            },
            required: ["claim1", "claim2", "explanation"],
            additionalProperties: false
          }
        }
      },
      required: ["contradictions"],
      additionalProperties: false
    },
    pluginName
  };
}

/**
 * Get extraction configuration for fact verification
 */
export function getFactVerificationConfig(pluginName: string): Omit<ExtractionConfig, 'extractionPrompt'> {
  return {
    toolName: "verify_facts",
    toolDescription: "Verify the accuracy of factual claims",
    toolSchema: {
      type: "object",
      properties: {
        verifications: {
          type: "array",
          items: {
            type: "object",
            properties: {
              claim: {
                type: "string",
                description: "The claim being verified"
              },
              verified: {
                type: "boolean",
                description: "Whether the claim is accurate"
              },
              explanation: {
                type: "string",
                description: "Explanation of the verification result"
              },
              confidence: {
                type: "string",
                enum: ["high", "medium", "low"],
                description: "Confidence level in the verification"
              }
            },
            required: ["claim", "verified", "explanation", "confidence"],
            additionalProperties: false
          }
        }
      },
      required: ["verifications"],
      additionalProperties: false
    },
    pluginName
  };
}