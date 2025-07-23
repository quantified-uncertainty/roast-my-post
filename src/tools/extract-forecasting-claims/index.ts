import { z } from "zod";

import { callClaudeWithTool } from "@/lib/claude/wrapper";
import { RichLLMInteraction } from "@/types/llm";
import { llmInteractionSchema } from "@/types/llmSchema";

import {
  Tool,
  ToolContext,
} from "../base/Tool";
import { smallSystemPrompt } from "./prompts";

// Define types for the tool

export interface ExtractForecastingClaimsInput {
  text: string;
  agentInstructions?: string;
  additionalContext?: string;
  maxDetailedAnalysis?: number;
  minQualityThreshold?: number;
}

export interface ExtractForecastingClaimsOutput {
  forecasts: ExtractedForecast[];
  llmInteractions: RichLLMInteraction[];
}

// Input validation schema
const inputSchema = z.object({
  text: z
    .string()
    .min(1)
    .max(10000)
    .describe("The text to analyze for forecasting claims"),
  agentInstructions: z
    .string()
    .max(1000)
    .optional()
    .describe("Instructions for prioritizing which forecasts to analyze"),
  additionalContext: z
    .string()
    .max(2000)
    .optional()
    .describe(
      "Additional context about the document, company, or topic to help make predictions more specific"
    ),
  maxDetailedAnalysis: z
    .number()
    .min(1)
    .max(10)
    .default(3)
    .describe("Maximum number of forecasts to select for detailed analysis"),
  minQualityThreshold: z
    .number()
    .min(0)
    .max(100)
    .optional()
    .describe(
      "Minimum average score (across precision, verifiability, and importance) required for a forecast to be included. Forecasts with average scores below this threshold will be filtered out."
    ),
}) satisfies z.ZodType<ExtractForecastingClaimsInput>;

// Define the forecast schema separately for reuse
const forecastSchema = z.object({
  originalText: z.string(),
  thinking: z.string(),
  predictionPrecisionScore: z.number().min(0).max(100),
  verifiabilityScore: z.number().min(0).max(100),
  importanceScore: z.number().min(0).max(100),
  rewrittenPredictionText: z.string(),
  statedProbability: z.number().min(0).max(100).optional(),
  resolutionDate: z.string().optional(),
  isFuture: z.boolean(),
});

// Infer the type from the schema
export type ExtractedForecast = z.infer<typeof forecastSchema>;

// Output validation schema
const outputSchema = z.object({
  forecasts: z
    .array(forecastSchema)
    .describe("Extracted forecasts with multi-dimensional scores"),
  llmInteractions: z
    .array(llmInteractionSchema)
    .describe("LLM interactions for monitoring"),
}) satisfies z.ZodType<ExtractForecastingClaimsOutput>;

export class ExtractForecastingClaimsTool extends Tool<
  ExtractForecastingClaimsInput,
  ExtractForecastingClaimsOutput
> {
  config = {
    id: "extract-forecasting-claims",
    name: "Extract Forecasting Claims",
    description:
      "Extracts predictions and converts them to binary (YES/NO) questions. Scores on three dimensions: precision (how binary/specific), verifiability (can we check with public data), and importance (centrality to argument)",
    version: "2.0.0",
    category: "analysis" as const,
    costEstimate: "~$0.01-0.03 per analysis (uses Claude Sonnet)",
  };

  inputSchema = inputSchema;
  outputSchema = outputSchema;

  async execute(
    input: ExtractForecastingClaimsInput,
    context: ToolContext
  ): Promise<ExtractForecastingClaimsOutput> {
    context.logger.info(
      `[ExtractForecastingClaims] Analyzing text for forecasting claims`
    );

    // Single step: Extract and score forecasts
    const results = await this.extractAndScoreForecasts(
      input.text,
      input.additionalContext,
      input.maxDetailedAnalysis ?? 3,
      input.minQualityThreshold
    );

    context.logger.info(
      `[ExtractForecastingClaims] Found ${results.forecasts.length} forecasts`
    );

    return {
      forecasts: results.forecasts,
      llmInteractions: results.llmInteractions,
    };
  }

  private async extractAndScoreForecasts(
    text: string,
    additionalContext: string | undefined,
    maxDetailedAnalysis: number,
    minQualityThreshold?: number
  ): Promise<ExtractForecastingClaimsOutput> {
    const systemPrompt = smallSystemPrompt;

    const qualityInstruction =
      minQualityThreshold !== undefined
        ? `\n\nIMPORTANT: Only return forecasts where the average of (predictionPrecisionScore + verifiabilityScore + importanceScore) / 3 is at least ${minQualityThreshold}. Calculate this average for each forecast and exclude any that don't meet this threshold.`
        : "";

    const userPrompt = additionalContext
      ? `Extract and score forecasts from this text:\n\n${text}\n\nAdditional Context:\n${additionalContext}\n\nInstructions:\nExtract up to ${maxDetailedAnalysis} predictions.${qualityInstruction}`
      : `Extract and score forecasts from this text:\n\n${text}\n\nInstructions:\nExtract up to ${maxDetailedAnalysis} predictions.${qualityInstruction}`;

    const result = await callClaudeWithTool<{ forecasts: any[] }>(
      {
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: userPrompt,
          },
        ],
        max_tokens: 2000,
        temperature: 0,
        enablePromptCaching: true,
        toolName: "extract_and_score_forecasts",
        toolDescription:
          "Extract forecast statements and score them for analysis priority",
        toolSchema: {
          type: "object",
          properties: {
            forecasts: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  originalText: {
                    type: "string",
                    description:
                      "The forecast statement, in the document. Capture the text exactly, so that we can use a regular expression to find it in the document.",
                  },
                  thinking: {
                    type: "string",
                    description:
                      "Analyze why this is a prediction and how to make it binary/resolvable. Focus on converting vague claims into YES/NO questions with specific thresholds.",
                  },
                  predictionPrecisionScore: {
                    type: "number",
                    description:
                      "Score 0-100 for how binary and precise the prediction is. 80+ for clear YES/NO with specific thresholds and dates. 60-79 for mostly binary. Below 60 for non-binary or vague predictions.",
                  },
                  verifiabilityScore: {
                    type: "number",
                    description:
                      "Score 0-100 for how verifiable the prediction is. Can we actually check if this comes true with public data? Consider data availability, measurability, and whether resolution criteria are objective.",
                  },
                  importanceScore: {
                    type: "number",
                    description:
                      "Score 0-100 for how important this prediction is to the document's argument or thesis. Is it central to the author's point or just a passing mention?",
                  },
                  rewrittenPredictionText: {
                    type: "string",
                    description:
                      "Rewrite as a clear YES/NO question with specific thresholds and dates. Include measurable criteria. Examples: 'Will X exceed Y by date Z?', 'Will company A achieve metric B by year C?'. For compound predictions, focus on the main claim.",
                  },
                  statedProbability: {
                    type: "number",
                    description:
                      "Probability percentage (0-100) based on explicit statement or inferred from language according to the probability inference guidelines. Never return null.",
                  },
                  resolutionDate: {
                    type: "string",
                    description:
                      "When the prediction can be resolved. Use ISO 8601 format (YYYY-MM-DD) for better parsing, e.g., '2025-12-31', '2024-06-30'. Use null if no timeframe specified.",
                  },
                  isFuture: {
                    type: "boolean",
                    description:
                      "Is the resolution date in the future (true) or has it already passed (false)?",
                  },
                },
                required: [
                  "originalText",
                  "thinking",
                  "predictionPrecisionScore",
                  "verifiabilityScore",
                  "importanceScore",
                  "rewrittenPredictionText",
                  "statedProbability",
                  "resolutionDate",
                  "isFuture",
                ],
              },
            },
          },
          required: ["forecasts"],
        },
      },
      []
    );

    // Process forecasts to validate with schema
    const forecasts = (result.toolResult.forecasts || []).map((f: any) => {
      const forecast = {
        originalText: f.originalText,
        thinking: f.thinking,
        predictionPrecisionScore: f.predictionPrecisionScore,
        verifiabilityScore: f.verifiabilityScore,
        importanceScore: f.importanceScore,
        rewrittenPredictionText: f.rewrittenPredictionText,
        statedProbability: f.statedProbability || undefined,
        resolutionDate: f.resolutionDate || undefined,
        isFuture: f.isFuture,
      };

      // Validate and return the forecast using the schema
      return forecastSchema.parse(forecast);
    });

    return {
      forecasts,
      llmInteractions: [result.interaction],
    };
  }
}

// Export singleton instance
export const extractForecastingClaimsTool = new ExtractForecastingClaimsTool();
export default extractForecastingClaimsTool;
