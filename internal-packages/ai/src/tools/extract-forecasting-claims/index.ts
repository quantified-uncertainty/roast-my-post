import { z } from "zod";

import { callClaudeWithTool } from "../../claude/wrapper";
import { logger } from "../../shared/logger";
import { generateCacheSeed } from "../shared/cache-utils";

import {
  Tool,
  ToolContext,
} from "../base/Tool";
import { smallSystemPrompt } from "./prompts";
import { extractForecastingClaimsConfig } from "../configs";

// Define types for the tool

export interface ExtractForecastingClaimsInput {
  text: string;
  additionalContext?: string;
  maxDetailedAnalysis?: number;
  minQualityThreshold?: number;
}

export interface ExtractForecastingClaimsOutput {
  forecasts: ExtractedForecast[];
}

// Input validation schema
const inputSchema = z.object({
  text: z
    .string()
    .min(1)
    .max(10000)
    .describe("The text to analyze for forecasting claims"),
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
      "Minimum average score (across precision, verifiability, and importance) required for a forecast to be included. Does not include robustness. Forecasts with average scores below this threshold will be filtered out."
    ),
}) satisfies z.ZodType<ExtractForecastingClaimsInput>;

// Define the forecast schema separately for reuse
const forecastSchema = z.object({
  originalText: z.string(),
  thinking: z.string(),
  precisionScore: z.number().min(0).max(100),
  verifiabilityScore: z.number().min(0).max(100),
  importanceScore: z.number().min(0).max(100),
  rewrittenPredictionText: z.string(),
  authorProbability: z.number().min(0).max(100).optional(),
  robustnessScore: z.number().min(0).max(100),
  resolutionDate: z.string().optional(),
  minimalProbabilitySpan: z.string().optional(),
});

// Infer the type from the schema
export type ExtractedForecast = z.infer<typeof forecastSchema>;

// Output validation schema
const outputSchema = z.object({
  forecasts: z
    .array(forecastSchema)
    .describe("Extracted forecasts with multi-dimensional scores"),
}) satisfies z.ZodType<ExtractForecastingClaimsOutput>;

export class ExtractForecastingClaimsTool extends Tool<
  ExtractForecastingClaimsInput,
  ExtractForecastingClaimsOutput
> {
  config = extractForecastingClaimsConfig;

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
      input.minQualityThreshold,
      context
    );

    context.logger.info(
      `[ExtractForecastingClaims] Found ${results.forecasts.length} forecasts`
    );

    return {
      forecasts: results.forecasts,
    };
  }

  private async extractAndScoreForecasts(
    text: string,
    additionalContext: string | undefined,
    maxDetailedAnalysis: number,
    minQualityThreshold?: number,
    context?: ToolContext
  ): Promise<{ forecasts: ExtractedForecast[] }> {
    const systemPrompt = smallSystemPrompt;

    const qualityInstruction =
      minQualityThreshold !== undefined
        ? `\n\nIMPORTANT: Only return forecasts where the average of (precisionScore + verifiabilityScore + importanceScore) / 3 is at least ${minQualityThreshold}. Calculate this average for each forecast and exclude any that don't meet this threshold.`
        : "";

    const userPrompt = `<task>
  <instruction>Extract and score forecasts from this text</instruction>
  
  <content>
${text}
  </content>
  
  ${additionalContext ? `<additional_context>\n${additionalContext}\n  </additional_context>\n  ` : ''}
  <parameters>
    <max_detailed_analysis>${maxDetailedAnalysis}</max_detailed_analysis>
    <min_quality_threshold>${minQualityThreshold}</min_quality_threshold>
  </parameters>
  
  <requirements>
    Extract up to ${maxDetailedAnalysis} predictions.${qualityInstruction}
  </requirements>
</task>`;


    // Generate cache seed for consistent responses
    const cacheSeed = generateCacheSeed('forecast-extract', [
      text,
      additionalContext || '',
      minQualityThreshold || 0,
      maxDetailedAnalysis || 30
    ]);

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
        cacheSeed,
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
                      "Analyze why this is a prediction and how to make it binary/resolvable. Focus on converting vague claims into YES/NO questions with specific thresholds. Ask if the specific prediction is reasonable or not. Think deeply.",
                  },
                  precisionScore: {
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
                  robustnessScore: {
                    type: "number",
                    description:
                      "Robustness assessment (0-100) - how likely this claim would hold up with comprehensive data. Based on empirical plausibility, not author trust. See system prompt for detailed scoring rubric.",
                  },
                  rewrittenPredictionText: {
                    type: "string",
                    description:
                      "Rewrite as a clear YES/NO question with specific thresholds and dates. Include measurable criteria. Examples: 'Will X exceed Y by date Z?', 'Will company A achieve metric B by year C?'. For compound predictions, focus on the main claim.",
                  },
                  authorProbability: {
                    type: "number",
                    description:
                      "The author's probability percentage (0-100) based on explicit statement or inferred from their language according to the probability inference guidelines. Never return null.",
                  },
                  resolutionDate: {
                    type: "string",
                    description:
                      "When the prediction can be resolved. Use ISO 8601 format (YYYY-MM-DD) for better parsing, e.g., '2025-12-31', '2024-06-30'. Use null if no timeframe specified.",
                  },
                  minimalProbabilitySpan: {
                    type: "string",
                    description:
                      "The minimal text span containing just the probability value from originalText (e.g., '70%', '80 percent', 'very likely'). This should be the smallest substring that captures the author's confidence expression. If no explicit probability found, leave null.",
                  },
                },
                required: [
                  "originalText",
                  "thinking",
                  "precisionScore",
                  "verifiabilityScore",
                  "importanceScore",
                  "rewrittenPredictionText",
                  "authorProbability",
                  "resolutionDate",
                  "robustnessScore",
                  "minimalProbabilitySpan",
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
    const forecasts = (result.toolResult.forecasts || [])
      .map((f: any) => {
        const forecast = {
          originalText: f.originalText,
          thinking: f.thinking,
          precisionScore: f.precisionScore,
          verifiabilityScore: f.verifiabilityScore,
          importanceScore: f.importanceScore,
          rewrittenPredictionText: f.rewrittenPredictionText,
          authorProbability: f.authorProbability || undefined,
          robustnessScore: f.robustnessScore,
          resolutionDate: f.resolutionDate || undefined,
        };

        // Validate using safeParse to handle errors gracefully
        const validationResult = forecastSchema.safeParse(forecast);
        if (!validationResult.success) {
          context?.logger.warn(`Invalid forecast data, skipping:`, validationResult.error);
          return null;
        }
        return validationResult.data;
      })
      .filter((forecast): forecast is NonNullable<typeof forecast> => forecast !== null); // Remove null entries

    return {
      forecasts,
    };
  }
}

// Export singleton instance
export const extractForecastingClaimsTool = new ExtractForecastingClaimsTool();
export default extractForecastingClaimsTool;
