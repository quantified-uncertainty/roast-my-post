/**
 * Principle of Charity Filter Tool (Two-Pass)
 *
 * Pass 1: Generate charitable interpretations (steelman each issue)
 * Pass 2: Validate whether issues survive those interpretations
 *
 * Splitting generation from validation prevents the bias where a model
 * that generates an interpretation is inclined to accept its own work.
 */

import { z } from "zod";
import { Tool, type ToolContext } from "../base/Tool";
import {
  callLLMFilter,
  withDateContext,
  type ReasoningConfig,
  type ProviderPreferences,
} from "../shared/llm-filter-utils";
import { REASONING_EFFORT_VALUES } from "../../types/common";
import type { UnifiedUsageMetrics } from "../../utils/usageMetrics";
import type {
  PrincipleOfCharityFilterInput,
  PrincipleOfCharityFilterOutput,
  CharityFilterResult,
} from "./types";
import {
  GENERATE_INTERPRETATIONS_PROMPT,
  VALIDATE_INTERPRETATIONS_PROMPT,
  DEFAULT_PRINCIPLE_OF_CHARITY_SYSTEM_PROMPT,
} from "./prompts";
import { principleOfCharityFilterConfig } from "./config";

// ============================================================================
// Schemas (Zod — for tool config validation)
// ============================================================================

const issueSchema = z.object({
  quotedText: z.string().describe("The exact text flagged as an issue"),
  issueType: z.string().describe("Type of issue identified"),
  reasoning: z.string().describe("The reasoning for why this was flagged"),
  locationOffset: z.number().optional().describe("Approximate location in document"),
});

const reasoningSchema = z.union([
  z.literal(false),
  z.object({ effort: z.enum(REASONING_EFFORT_VALUES) }),
  z.object({ budget_tokens: z.number().min(1024) }),
]);

const providerSchema = z.object({
  order: z.array(z.string()).optional(),
  allow_fallbacks: z.boolean().optional(),
});

const inputSchema = z.object({
  documentText: z.string().min(1).max(200000).describe("Full document text for context"),
  issues: z.array(issueSchema).describe("Issues to evaluate with principle of charity"),
  model: z.string().optional().describe("Model to use (Claude or OpenRouter model ID)"),
  temperature: z.number().min(0).max(2).optional().describe("Temperature (0-2). Default 0.2"),
  reasoning: reasoningSchema.optional().describe("Reasoning/thinking configuration"),
  provider: providerSchema.optional().describe("Provider routing preferences (OpenRouter only)"),
  customPrompt: z.string().optional().describe("Custom system prompt (overrides default)"),
});

const resultSchema = z.object({
  index: z.number().describe("Index of the issue in the input array"),
  remainsValid: z.boolean().describe("Whether issue remains valid under charitable interpretation"),
  charitableInterpretation: z.string().describe("The charitable interpretation of the argument"),
  explanation: z.string().describe("Explanation of why issue does/doesn't hold"),
});

const outputSchema = z.object({
  validIssues: z.array(resultSchema).describe("Issues that remain valid under charity"),
  dissolvedIssues: z.array(resultSchema).describe("Issues that dissolve under charity"),
});

// ============================================================================
// Constants
// ============================================================================

const FILTER_NAME = "PrincipleOfCharityFilter";
const DEFAULT_TEMPERATURE = 0.2;
const INTRO_LENGTH = 2000;
const CONCLUSION_LENGTH = 1500;
const CONTEXT_RADIUS = 500;
const MAX_CONTEXT_LENGTH = 12000;

// ============================================================================
// Pass 1: Generate Interpretations — LLM tool schema
// ============================================================================

const generateSchema = {
  type: "object" as const,
  properties: {
    interpretations: {
      type: "array",
      items: {
        type: "object",
        properties: {
          index: {
            type: "number",
            description: "Index of the issue (0-based)",
          },
          charitableInterpretation: {
            type: "string",
            description: "The most charitable interpretation of the author's argument",
          },
          strengthOfInterpretation: {
            type: "string",
            enum: ["strong", "moderate", "weak"],
            description: "How plausible this charitable reading is",
          },
        },
        required: ["index", "charitableInterpretation", "strengthOfInterpretation"],
      },
    },
  },
  required: ["interpretations"],
};

interface GenerateResult {
  interpretations: Array<{
    index: number;
    charitableInterpretation: string;
    strengthOfInterpretation: 'strong' | 'moderate' | 'weak';
  }>;
}

// ============================================================================
// Pass 2: Validate Interpretations — LLM tool schema
// ============================================================================

const validateSchema = {
  type: "object" as const,
  properties: {
    results: {
      type: "array",
      items: {
        type: "object",
        properties: {
          index: {
            type: "number",
            description: "Index of the issue (0-based)",
          },
          remainsValid: {
            type: "boolean",
            description: "Whether the issue remains valid despite the charitable interpretation",
          },
          explanation: {
            type: "string",
            description: "Why the issue does or doesn't hold given the interpretation",
          },
        },
        required: ["index", "remainsValid", "explanation"],
      },
    },
  },
  required: ["results"],
};

interface ValidateResult {
  results: Array<{
    index: number;
    remainsValid: boolean;
    explanation: string;
  }>;
}

// ============================================================================
// Tool Implementation
// ============================================================================

export class PrincipleOfCharityFilterTool extends Tool<
  PrincipleOfCharityFilterInput,
  PrincipleOfCharityFilterOutput
> {
  config = principleOfCharityFilterConfig;
  inputSchema = inputSchema;
  outputSchema = outputSchema;

  async execute(
    input: PrincipleOfCharityFilterInput,
    context: ToolContext
  ): Promise<PrincipleOfCharityFilterOutput> {
    context.logger.debug(`[${FILTER_NAME}] Starting with ${input.issues.length} issues`);
    for (let i = 0; i < input.issues.length; i++) {
      context.logger.debug(
        `[${FILTER_NAME}] Issue ${i}: "${input.issues[i].quotedText.substring(0, 60)}..." (${input.issues[i].issueType})`
      );
    }

    context.logger.info(
      `[${FILTER_NAME}] Evaluating ${input.issues.length} issues (two-pass: generate + validate)`
    );

    if (input.issues.length === 0) {
      return { validIssues: [], dissolvedIssues: [] };
    }

    // Prepare document context (shared across both passes)
    const docForPrompt =
      input.documentText.length <= 15000
        ? input.documentText
        : this.extractRelevantContext(input.documentText, input.issues);

    const formattedIssues = input.issues
      .map((issue, idx) => {
        return `**Issue ${idx}**:
Text: "${issue.quotedText}"
Type: ${issue.issueType}
Reasoning: ${issue.reasoning}
`;
      })
      .join("\n---\n\n");

    const temperature = input.temperature ?? DEFAULT_TEMPERATURE;
    const reasoning = input.reasoning as ReasoningConfig | undefined;
    const provider = input.provider as ProviderPreferences | undefined;

    try {
      // ====================================================================
      // Pass 1: Generate charitable interpretations
      // ====================================================================
      const pass1Prompt = input.customPrompt || GENERATE_INTERPRETATIONS_PROMPT;

      const pass1UserPrompt = `Generate the strongest charitable interpretation for each flagged issue:

**Document Context**:
${docForPrompt}

**Issues to Interpret**:

${formattedIssues}

For each issue, provide:
1. The most charitable interpretation of the author's argument
2. The strength of that interpretation (strong/moderate/weak)`;

      context.logger.info(`[${FILTER_NAME}] Pass 1: Generating charitable interpretations`);

      const pass1Result = await callLLMFilter<GenerateResult>(
        {
          model: input.model,
          modelEnvVar: "CHARITY_FILTER_MODEL",
          systemPrompt: withDateContext(pass1Prompt),
          userPrompt: pass1UserPrompt,
          temperature,
          reasoning,
          provider,
          toolName: "charitable_interpretations",
          toolDescription: "Charitable interpretations for each flagged issue",
          toolSchema: generateSchema,
          filterName: `${FILTER_NAME}/Generate`,
        },
        context
      );

      // Index interpretations by issue index for lookup
      const interpretationMap = new Map<number, GenerateResult['interpretations'][0]>();
      for (const interp of pass1Result.toolResult.interpretations) {
        if (interp.index >= 0 && interp.index < input.issues.length) {
          interpretationMap.set(interp.index, interp);
        } else {
          context.logger.warn(`[${FILTER_NAME}] Pass 1: Invalid index ${interp.index}, skipping`);
        }
      }

      context.logger.info(
        `[${FILTER_NAME}] Pass 1 complete: ${interpretationMap.size}/${input.issues.length} interpretations generated`
      );

      // ====================================================================
      // Pass 2: Validate interpretations
      // ====================================================================
      const formattedWithInterpretations = input.issues
        .map((issue, idx) => {
          const interp = interpretationMap.get(idx);
          return `**Issue ${idx}**:
Text: "${issue.quotedText}"
Type: ${issue.issueType}
Original reasoning: ${issue.reasoning}
${interp
    ? `Charitable interpretation: ${interp.charitableInterpretation}
Interpretation strength: ${interp.strengthOfInterpretation}`
    : `Charitable interpretation: (none generated — treat as if no charitable reading exists)`}
`;
        })
        .join("\n---\n\n");

      const pass2UserPrompt = `Evaluate whether each flagged issue survives its charitable interpretation:

**Document Context**:
${docForPrompt}

**Issues with Charitable Interpretations**:

${formattedWithInterpretations}

For each issue, determine:
1. Whether it remains valid (true) or dissolves (false) given the charitable interpretation
2. Brief explanation of your reasoning`;

      context.logger.info(`[${FILTER_NAME}] Pass 2: Validating interpretations`);

      const pass2Result = await callLLMFilter<ValidateResult>(
        {
          model: input.model,
          modelEnvVar: "CHARITY_FILTER_MODEL",
          systemPrompt: withDateContext(VALIDATE_INTERPRETATIONS_PROMPT),
          userPrompt: pass2UserPrompt,
          temperature,
          reasoning,
          provider,
          toolName: "principle_of_charity_results",
          toolDescription: "Validation results for charitable interpretations",
          toolSchema: validateSchema,
          filterName: `${FILTER_NAME}/Validate`,
        },
        context
      );

      // ====================================================================
      // Merge Pass 1 + Pass 2 into CharityFilterResult[]
      // ====================================================================
      const validIssues: CharityFilterResult[] = [];
      const dissolvedIssues: CharityFilterResult[] = [];

      for (const r of pass2Result.toolResult.results) {
        if (r.index < 0 || r.index >= input.issues.length) {
          context.logger.warn(`[${FILTER_NAME}] Pass 2: Invalid index ${r.index}, skipping`);
          continue;
        }

        const interp = interpretationMap.get(r.index);
        const filterResult: CharityFilterResult = {
          index: r.index,
          remainsValid: r.remainsValid,
          charitableInterpretation: interp?.charitableInterpretation ?? "No interpretation generated",
          explanation: r.explanation,
          strengthOfInterpretation: interp?.strengthOfInterpretation,
        };

        if (r.remainsValid) {
          validIssues.push(filterResult);
        } else {
          dissolvedIssues.push(filterResult);
        }
      }

      // Log summary
      context.logger.info(
        `[${FILTER_NAME}] ${dissolvedIssues.length}/${input.issues.length} issues dissolved, ${validIssues.length} remain valid`
      );

      for (const issue of validIssues) {
        const strength = issue.strengthOfInterpretation ? ` [interp: ${issue.strengthOfInterpretation}]` : '';
        context.logger.debug(
          `[${FILTER_NAME}] Issue ${issue.index} REMAINS VALID${strength}: ${issue.explanation.substring(0, 100)}...`
        );
      }
      for (const issue of dissolvedIssues) {
        const strength = issue.strengthOfInterpretation ? ` [interp: ${issue.strengthOfInterpretation}]` : '';
        context.logger.debug(
          `[${FILTER_NAME}] Issue ${issue.index} DISSOLVED${strength}: ${issue.explanation.substring(0, 100)}...`
        );
      }

      // Combine usage from both passes
      const combinedUsage = combineUsage(pass1Result.unifiedUsage, pass2Result.unifiedUsage);

      if (combinedUsage) {
        context.logger.debug(
          `[${FILTER_NAME}] Combined cost: $${combinedUsage.costUsd.toFixed(6)} (pass1 + pass2)`
        );
      }

      return {
        validIssues,
        dissolvedIssues,
        unifiedUsage: combinedUsage,
        // Use pass 2's API params/metrics as the "primary" ones (the validation is the decision-maker)
        actualApiParams: pass2Result.actualApiParams,
        responseMetrics: pass2Result.responseMetrics,
      };
    } catch (error) {
      context.logger.error(`[${FILTER_NAME}] Filter failed:`, error);
      // Fallback: assume all issues remain valid (keep them)
      return {
        validIssues: input.issues.map((_, idx) => ({
          index: idx,
          remainsValid: true,
          charitableInterpretation: "Fallback: filter failed, preserving issue",
          explanation: "Fallback: filter failed, preserving issue",
        })),
        dissolvedIssues: [],
      };
    }
  }

  /**
   * Extract relevant context around the flagged issues
   */
  private extractRelevantContext(
    documentText: string,
    issues: PrincipleOfCharityFilterInput["issues"]
  ): string {
    const chunks: string[] = [];

    // Always include intro
    chunks.push("**[INTRODUCTION]**\n" + documentText.substring(0, INTRO_LENGTH));

    // Include context around each issue
    for (const issue of issues) {
      if (issue.locationOffset !== undefined) {
        const start = Math.max(0, issue.locationOffset - CONTEXT_RADIUS);
        const end = Math.min(
          documentText.length,
          issue.locationOffset + issue.quotedText.length + CONTEXT_RADIUS
        );
        chunks.push(
          `**[CONTEXT FOR: "${issue.quotedText.substring(0, 50)}..."]**\n` +
            documentText.substring(start, end)
        );
      }
    }

    // Always include conclusion if document is long enough
    if (documentText.length > INTRO_LENGTH + CONCLUSION_LENGTH) {
      chunks.push(
        "**[CONCLUSION]**\n" + documentText.substring(documentText.length - CONCLUSION_LENGTH)
      );
    }

    // Combine and truncate to max length
    let result = chunks.join("\n\n---\n\n");
    if (result.length > MAX_CONTEXT_LENGTH) {
      result = result.substring(0, MAX_CONTEXT_LENGTH) + "\n...[truncated]...";
    }

    return result;
  }
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Combine usage metrics from two LLM calls (Pass 1 + Pass 2)
 */
function combineUsage(
  a: UnifiedUsageMetrics | undefined,
  b: UnifiedUsageMetrics | undefined
): UnifiedUsageMetrics | undefined {
  if (!a && !b) return undefined;
  if (!a) return b;
  if (!b) return a;

  return {
    inputTokens: a.inputTokens + b.inputTokens,
    outputTokens: a.outputTokens + b.outputTokens,
    totalTokens: a.totalTokens + b.totalTokens,
    costUsd: a.costUsd + b.costUsd,
    isCostFromApi: a.isCostFromApi && b.isCostFromApi,
    cacheReadTokens: (a.cacheReadTokens ?? 0) + (b.cacheReadTokens ?? 0) || undefined,
    cacheWriteTokens: (a.cacheWriteTokens ?? 0) + (b.cacheWriteTokens ?? 0) || undefined,
    reasoningTokens: (a.reasoningTokens ?? 0) + (b.reasoningTokens ?? 0) || undefined,
    provider: b.provider,
    model: b.model,
    latencyMs: a.latencyMs + b.latencyMs,
  };
}

export const principleOfCharityFilterTool = new PrincipleOfCharityFilterTool();
export default principleOfCharityFilterTool;
