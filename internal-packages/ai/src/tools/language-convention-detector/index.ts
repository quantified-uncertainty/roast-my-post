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
} from "./conventionDetector";
import { callClaudeWithTool, MODEL_CONFIG } from "../../claude/wrapper";

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

    // Detect language convention using LLM-based two-step reasoning
    const conventionResult = await detectLanguageConventionWithLLM(sample, context);

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

/**
 * LLM-based language convention detection using two-step reasoning
 * Step 1: Gather evidence/reasons for dialect detection
 * Step 2: Evaluate evidence and provide conclusion with confidence/consistency
 */
async function detectLanguageConventionWithLLM(
  text: string,
  context: ToolContext
): Promise<{
  convention: LanguageConvention;
  confidence: number;
  consistency: number;
  evidence: Array<{
    word: string;
    convention: LanguageConvention;
    count: number;
  }>;
}> {
  context.logger.info("Starting LLM-based language convention detection");

  // Step 1: Gather evidence
  const evidenceResult = await callClaudeWithTool<{
    evidence: Array<{
      word: string;
      convention: "US" | "UK";
      reason: string;
      count: number;
    }>;
    initialAssessment: "US" | "UK";
  }>({
    model: MODEL_CONFIG.analysis,
    system: `You are an expert at detecting English language conventions (US vs UK English). 
Your task is to analyze text and identify evidence that indicates whether it uses US or UK English conventions.

Look for:
- Spelling differences (e.g., organize/organise, color/colour, center/centre)
- Word choices (e.g., elevator/lift, apartment/flat)
- Grammar patterns (e.g., collective nouns, prepositions)
- Punctuation differences (e.g., quotation marks)

Provide specific examples with word counts and clear reasoning for each piece of evidence.`,
    messages: [
      {
        role: "user",
        content: `Analyze the following text and identify evidence for whether it uses US or UK English conventions. 
List specific words, phrases, or patterns that indicate the dialect, along with your reasoning.

Text to analyze:
${text}`,
      },
    ],
    max_tokens: 4000,
    temperature: 0.1,
    toolName: "gather_evidence",
    toolDescription: "Gather evidence for language convention detection",
    toolSchema: {
      type: "object",
      properties: {
        evidence: {
          type: "array",
          items: {
            type: "object",
            properties: {
              word: { type: "string", description: "The word or phrase found" },
              convention: { type: "string", enum: ["US", "UK"], description: "Which convention this indicates" },
              reason: { type: "string", description: "Why this indicates US or UK English" },
              count: { type: "number", description: "Number of occurrences in the text" },
            },
            required: ["word", "convention", "reason", "count"],
          },
          description: "List of evidence items supporting the detection",
        },
        initialAssessment: {
          type: "string",
          enum: ["US", "UK"],
          description: "Your initial assessment based on the evidence gathered",
        },
      },
      required: ["evidence", "initialAssessment"],
    },
  });

  const evidence = evidenceResult.toolResult.evidence;
  const initialAssessment = evidenceResult.toolResult.initialAssessment;

  context.logger.info("Step 1 completed", {
    evidenceCount: evidence.length,
    initialAssessment,
  });

  // Step 2: Evaluate evidence and provide conclusion
  const evaluationResult = await callClaudeWithTool<{
    convention: "US" | "UK";
    confidence: number;
    consistency: number;
    reasoning: string;
    topEvidence: Array<{
      word: string;
      convention: "US" | "UK";
      count: number;
    }>;
  }>({
    model: MODEL_CONFIG.analysis,
    system: `You are an expert evaluator of language convention evidence. 
Your task is to review a list of evidence items and provide a final assessment with confidence and consistency scores.

Consider:
- How strong and consistent the evidence is
- Whether there are conflicting indicators
- The overall pattern of usage
- Confidence should reflect how certain you are (0-1)
- Consistency should reflect how uniform the usage is (0-1, where 1 means very consistent, 0.5 means mixed)`,
    messages: [
      {
        role: "user",
        content: `Evaluate the following evidence for language convention detection and provide your final assessment.

Evidence gathered:
${evidence.map((e, i) => `${i + 1}. "${e.word}" (${e.convention}) - ${e.reason} (appears ${e.count} time${e.count > 1 ? 's' : ''})`).join('\n')}

Initial assessment: ${initialAssessment}

Provide your final conclusion with confidence and consistency scores.`,
      },
    ],
    max_tokens: 2000,
    temperature: 0.1,
    toolName: "evaluate_evidence",
    toolDescription: "Evaluate evidence and provide final language convention assessment",
    toolSchema: {
      type: "object",
      properties: {
        convention: {
          type: "string",
          enum: ["US", "UK"],
          description: "Final detected language convention",
        },
        confidence: {
          type: "number",
          minimum: 0,
          maximum: 1,
          description: "Confidence in the detection (0-1)",
        },
        consistency: {
          type: "number",
          minimum: 0,
          maximum: 1,
          description: "How consistent the document is (0-1, where 1 is very consistent, 0.5 is mixed)",
        },
        reasoning: {
          type: "string",
          description: "Brief explanation of your assessment",
        },
        topEvidence: {
          type: "array",
          items: {
            type: "object",
            properties: {
              word: { type: "string" },
              convention: { type: "string", enum: ["US", "UK"] },
              count: { type: "number" },
            },
            required: ["word", "convention", "count"],
          },
          description: "Top 10 most significant evidence items",
        },
      },
      required: ["convention", "confidence", "consistency", "reasoning", "topEvidence"],
    },
  });

  const evaluation = evaluationResult.toolResult;

  context.logger.info("Step 2 completed", {
    convention: evaluation.convention,
    confidence: evaluation.confidence,
    consistency: evaluation.consistency,
    evidenceCount: evaluation.topEvidence.length,
  });

  return {
    convention: evaluation.convention,
    confidence: evaluation.confidence,
    consistency: evaluation.consistency,
    evidence: evaluation.topEvidence.map((e) => ({
      word: e.word,
      convention: e.convention,
      count: e.count,
    })),
  };
}

// Export singleton instance
export const detectLanguageConventionTool = new DetectLanguageConventionTool();
