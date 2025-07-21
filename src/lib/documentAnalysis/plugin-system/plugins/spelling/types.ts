/**
 * Type definitions for the Spelling plugin
 */

import { z } from 'zod';

// Schema for individual spelling/grammar errors
export const SpellingErrorSchema = z.object({
  text: z.string().describe("The erroneous text"),
  correction: z.string().describe("The suggested correction"),
  type: z.enum(["spelling", "grammar", "style"]).describe("Type of error"),
  context: z.string().optional().describe("Surrounding context"),
  rule: z.string().optional().describe("Grammar rule or explanation"),
  severity: z.enum(["low", "medium", "high"]).optional().default("low")
});

export type SpellingError = z.infer<typeof SpellingErrorSchema>;

// Schema for extraction results
export const SpellingExtractionResultSchema = z.object({
  errors: z.array(SpellingErrorSchema)
});

export type SpellingExtractionResult = z.infer<typeof SpellingExtractionResultSchema>;

// Internal storage for findings
export interface SpellingFindingStorage {
  potential: any[];
  investigated: any[];
  located: any[];
  summary?: string;
  analysisSummary?: string;
}

// Tool configuration for Claude
export function getSpellingExtractionConfig(pluginName: string) {
  return {
    toolName: 'report_spelling_errors',
    toolDescription: 'Report spelling, grammar, and style errors found in the text',
    toolSchema: {
      type: "object",
      properties: {
        errors: {
          type: "array",
          items: {
            type: "object",
            properties: {
              text: { type: "string", description: "The erroneous text" },
              correction: { type: "string", description: "The suggested correction" },
              type: { 
                type: "string", 
                enum: ["spelling", "grammar", "style"],
                description: "Type of error"
              },
              context: { type: "string", description: "Surrounding context (optional)" },
              rule: { type: "string", description: "Grammar rule or explanation (optional)" },
              severity: {
                type: "string",
                enum: ["low", "medium", "high"],
                description: "Severity of the error (optional, defaults to low)"
              }
            },
            required: ["text", "correction", "type"]
          }
        }
      },
      required: ["errors"]
    },
    pluginName
  };
}