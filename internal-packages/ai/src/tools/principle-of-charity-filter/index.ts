/**
 * Principle of Charity Filter Tool
 *
 * Applies the principle of charity - interpreting arguments in their strongest,
 * most reasonable form before critiquing. Filters out issues that don't hold
 * when the author's argument is charitably interpreted.
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
import type {
  PrincipleOfCharityFilterInput,
  PrincipleOfCharityFilterOutput,
  CharityFilterResult,
} from "./types";
import { DEFAULT_PRINCIPLE_OF_CHARITY_SYSTEM_PROMPT } from "./prompts";
import { principleOfCharityFilterConfig } from "./config";

// ============================================================================
// Schemas
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
// Tool Schema for LLM
// ============================================================================

const toolSchema = {
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
            description: "Whether issue remains valid under charitable interpretation",
          },
          charitableInterpretation: {
            type: "string",
            description: "The most charitable interpretation of the author's argument",
          },
          explanation: {
            type: "string",
            description: "Explanation of why the issue does/doesn't hold",
          },
        },
        required: ["index", "remainsValid", "charitableInterpretation", "explanation"],
      },
    },
  },
  required: ["results"],
};

type FilterResults = {
  results: Array<{
    index: number;
    remainsValid: boolean;
    charitableInterpretation: string;
    explanation: string;
  }>;
};

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
    // Log input issues
    context.logger.debug(`[${FILTER_NAME}] Starting with ${input.issues.length} issues`);
    for (let i = 0; i < input.issues.length; i++) {
      context.logger.debug(
        `[${FILTER_NAME}] Issue ${i}: "${input.issues[i].quotedText.substring(0, 60)}..." (${input.issues[i].issueType})`
      );
    }

    context.logger.info(
      `[${FILTER_NAME}] Evaluating ${input.issues.length} issues with principle of charity`
    );

    // If no issues, return empty result
    if (input.issues.length === 0) {
      return {
        validIssues: [],
        dissolvedIssues: [],
      };
    }

    // Format issues for the LLM
    const formattedIssues = input.issues
      .map((issue, idx) => {
        return `**Issue ${idx}**:
Text: "${issue.quotedText}"
Type: ${issue.issueType}
Reasoning: ${issue.reasoning}
`;
      })
      .join("\n---\n\n");

    // Prepare document text (truncate if needed)
    const docForPrompt =
      input.documentText.length <= 15000
        ? input.documentText
        : this.extractRelevantContext(input.documentText, input.issues);

    const userPrompt = `Apply the Principle of Charity to evaluate these flagged issues:

**Document Context**:
${docForPrompt}

**Issues to Evaluate**:

${formattedIssues}

For each issue:
1. First, articulate the most charitable interpretation of the author's argument
2. Then determine if the issue still holds under that interpretation
3. Explain your reasoning`;

    try {
      // Always prepend date context to prevent false positives on recent dates
      const basePrompt = input.customPrompt || DEFAULT_PRINCIPLE_OF_CHARITY_SYSTEM_PROMPT;
      const result = await callLLMFilter<FilterResults>(
        {
          model: input.model,
          modelEnvVar: "CHARITY_FILTER_MODEL",
          systemPrompt: withDateContext(basePrompt),
          userPrompt,
          temperature: input.temperature ?? DEFAULT_TEMPERATURE,
          reasoning: input.reasoning as ReasoningConfig | undefined,
          provider: input.provider as ProviderPreferences | undefined,
          toolName: "principle_of_charity_results",
          toolDescription: "Results of evaluating issues with principle of charity",
          toolSchema,
          filterName: FILTER_NAME,
        },
        context
      );

      // Process results
      const validIssues: CharityFilterResult[] = [];
      const dissolvedIssues: CharityFilterResult[] = [];

      for (const r of result.toolResult.results) {
        // Validate index is in range
        if (r.index < 0 || r.index >= input.issues.length) {
          context.logger.warn(`[${FILTER_NAME}] Invalid index ${r.index}, skipping`);
          continue;
        }

        const filterResult: CharityFilterResult = {
          index: r.index,
          remainsValid: r.remainsValid,
          charitableInterpretation: r.charitableInterpretation,
          explanation: r.explanation,
        };

        if (r.remainsValid) {
          validIssues.push(filterResult);
        } else {
          dissolvedIssues.push(filterResult);
        }
      }

      context.logger.info(
        `[${FILTER_NAME}] ${dissolvedIssues.length}/${input.issues.length} issues dissolved (filtered out), ${validIssues.length} remain valid`
      );

      // Debug logging
      for (const issue of validIssues) {
        context.logger.debug(
          `[${FILTER_NAME}] Issue ${issue.index} REMAINS VALID: ${issue.explanation.substring(0, 100)}...`
        );
      }
      for (const issue of dissolvedIssues) {
        context.logger.debug(
          `[${FILTER_NAME}] Issue ${issue.index} DISSOLVED: ${issue.explanation.substring(0, 100)}...`
        );
      }

      if (result.unifiedUsage) {
        context.logger.debug(
          `[${FILTER_NAME}] Cost: $${result.unifiedUsage.costUsd.toFixed(6)}`
        );
      }

      return {
        validIssues,
        dissolvedIssues,
        unifiedUsage: result.unifiedUsage,
        actualApiParams: result.actualApiParams,
        responseMetrics: result.responseMetrics,
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

export const principleOfCharityFilterTool = new PrincipleOfCharityFilterTool();
export default principleOfCharityFilterTool;
