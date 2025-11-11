import { z } from "zod";

import type { LanguageConvention } from "../../shared/types";
import { countWords, truncateToWords } from "../../shared/types";
import {
  Tool,
  ToolContext,
} from "../base/Tool";
import { languageConventionDetectorConfig } from "../configs";
import {
  detectDocumentType,
  detectLanguageConvention,
} from "./conventionDetector";

// Configuration constants
export const DEFAULT_SAMPLE_SIZE = 2000; // Number of words to sample

export interface DetectLanguageConventionInput {
  text: string;
  sampleSize?: number;
}

export interface DetectLanguageConventionOutput {
  convention: LanguageConvention;
  confidence: number;
  consistency: number;
  evidence: Array<{
    word: string;
    convention: LanguageConvention;
    count: number;
  }>;
  documentType?: {
    type: "academic" | "technical" | "blog" | "casual" | "unknown";
    confidence: number;
  };
}

// Input schema
const inputSchema = z.object({
  text: z
    .string()
    .min(1)
    .max(500000)
    .describe("The text to analyze for language convention (multiline)"),
  // sampleSize is internal - not exposed to UI
}) satisfies z.ZodType<Omit<DetectLanguageConventionInput, "sampleSize">>;

// Output schema
const outputSchema = z.object({
  convention: z.enum(["US", "UK"]).describe("Dominant language convention"),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe("Confidence in the detection (0-1)"),
  consistency: z
    .number()
    .min(0)
    .max(1)
    .describe("How consistent the document is (0-1)"),
  evidence: z
    .array(
      z.object({
        word: z.string().describe("Example word found"),
        convention: z
          .enum(["US", "UK"] as const)
          .describe("Which convention this word belongs to"),
        count: z.number().describe("Number of occurrences"),
      })
    )
    .describe("Evidence supporting the detection"),
  documentType: z
    .object({
      type: z
        .enum(["academic", "technical", "blog", "casual", "unknown"])
        .describe("Type of document"),
      confidence: z
        .number()
        .min(0)
        .max(1)
        .describe("Confidence in document type detection"),
    })
    .optional()
    .describe("Detected document type"),
});

export class DetectLanguageConventionTool extends Tool<
  DetectLanguageConventionInput,
  DetectLanguageConventionOutput
> {
  config = languageConventionDetectorConfig;

  inputSchema = inputSchema;
  outputSchema = outputSchema as any;

  async execute(
    input: DetectLanguageConventionInput,
    context: ToolContext
  ): Promise<DetectLanguageConventionOutput> {
    const maxWords = input.sampleSize || DEFAULT_SAMPLE_SIZE;
    const totalWords = countWords(input.text);
    
    context.logger.info("Detecting language convention", {
      textLength: input.text.length,
      totalWords,
      sampleSize: maxWords,
    });

    // Truncate to first N words (not characters)
    const sample = truncateToWords(input.text, maxWords);
    const sampleWordCount = countWords(sample);
    
    context.logger.info("Text sample prepared", {
      sampleLength: sample.length,
      sampleWordCount,
      truncated: sampleWordCount < totalWords,
    });

    // Detect language convention
    const conventionResult = detectLanguageConvention(sample);

    // Also detect document type for additional context
    const documentTypeResult = detectDocumentType(sample);

    context.logger.info("Convention detected", {
      convention: conventionResult.convention,
      confidence: conventionResult.confidence,
      evidenceCount: conventionResult.evidence.length,
      documentType: documentTypeResult.type,
    });

    return {
      convention: conventionResult.convention,
      confidence: conventionResult.confidence,
      consistency: conventionResult.consistency,
      evidence: conventionResult.evidence.slice(0, 10), // Limit to top 10 evidence items
      documentType: {
        type: documentTypeResult.type,
        confidence: documentTypeResult.confidence,
      },
    };
  }
}

// Export singleton instance
export const detectLanguageConventionTool = new DetectLanguageConventionTool();
