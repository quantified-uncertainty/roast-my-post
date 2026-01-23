/**
 * Supported Elsewhere Filter Tool
 *
 * Checks if claims or arguments flagged as issues are actually supported,
 * explained, or qualified elsewhere in the document. Common in well-structured
 * writing where intro claims are backed up later in the text.
 */

import { z } from "zod";
import { Tool, type ToolContext } from "../base/Tool";
import {
  callLLMFilter,
  truncateDocumentForContext,
  withDateContext,
  type ReasoningConfig,
  type ProviderPreferences,
} from "../shared/llm-filter-utils";
import type {
  SupportedElsewhereFilterInput,
  SupportedElsewhereFilterOutput,
  SupportedElsewhereResult,
} from "./types";
import { DEFAULT_SUPPORTED_ELSEWHERE_SYSTEM_PROMPT } from "./prompts";

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
  z.object({ effort: z.enum(["minimal", "low", "medium", "high", "xhigh"]) }),
  z.object({ budget_tokens: z.number().min(1024) }),
]);

const providerSchema = z.object({
  order: z.array(z.string()).optional(),
  allow_fallbacks: z.boolean().optional(),
});

const inputSchema = z.object({
  documentText: z.string().min(1).max(200000).describe("Full document text to search"),
  issues: z.array(issueSchema).describe("Issues to check for support elsewhere"),
  model: z.string().optional().describe("Model to use (Claude or OpenRouter model ID)"),
  temperature: z.number().min(0).max(2).optional().describe("Temperature (0-2). Default 0.1"),
  reasoning: reasoningSchema.optional().describe("Reasoning/thinking configuration"),
  provider: providerSchema.optional().describe("Provider routing preferences (OpenRouter only)"),
  customPrompt: z.string().optional().describe("Custom system prompt (overrides default)"),
});

const resultSchema = z.object({
  index: z.number().describe("Index of the issue in the input array"),
  isSupported: z.boolean().describe("Whether this issue is supported elsewhere"),
  supportLocation: z.string().optional().describe("Where the support was found"),
  explanation: z.string().describe("Explanation of the support or lack thereof"),
});

const outputSchema = z.object({
  unsupportedIssues: z.array(resultSchema).describe("Issues NOT supported elsewhere"),
  supportedIssues: z.array(resultSchema).describe("Issues ARE supported elsewhere"),
});

// ============================================================================
// Tool Config
// ============================================================================

const supportedElsewhereFilterConfig = {
  id: "supported-elsewhere-filter",
  name: "Supported Elsewhere Filter",
  description: "Checks if flagged issues are supported elsewhere in the document",
  version: "1.0.0",
  category: "utility" as const,
};

// ============================================================================
// Constants
// ============================================================================

const FILTER_NAME = "SupportedElsewhereFilter";
const DEFAULT_TEMPERATURE = 0.1;
const EVIDENCE_KEYWORDS = [
  "method", "data", "result", "study", "research", "evidence",
  "citation", "reference", "source", "appendix", "table", "figure",
  "analysis", "finding", "sample", "participant", "measure",
  "because", "therefore", "thus", "since", "reason", "explain",
];

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
          isSupported: {
            type: "boolean",
            description: "Whether this issue is supported elsewhere",
          },
          supportLocation: {
            type: "string",
            description: "Where the support was found (quote or description)",
          },
          explanation: {
            type: "string",
            description: "Explanation of why it is/isn't supported",
          },
        },
        required: ["index", "isSupported", "explanation"],
      },
    },
  },
  required: ["results"],
};

type FilterResults = {
  results: Array<{
    index: number;
    isSupported: boolean;
    supportLocation?: string;
    explanation: string;
  }>;
};

// ============================================================================
// Tool Implementation
// ============================================================================

export class SupportedElsewhereFilterTool extends Tool<
  SupportedElsewhereFilterInput,
  SupportedElsewhereFilterOutput
> {
  config = supportedElsewhereFilterConfig;
  inputSchema = inputSchema;
  outputSchema = outputSchema;

  async execute(
    input: SupportedElsewhereFilterInput,
    context: ToolContext
  ): Promise<SupportedElsewhereFilterOutput> {
    // Log input issues
    context.logger.debug(`[${FILTER_NAME}] Starting with ${input.issues.length} issues`);
    for (let i = 0; i < input.issues.length; i++) {
      context.logger.debug(
        `[${FILTER_NAME}] Issue ${i}: "${input.issues[i].quotedText.substring(0, 60)}..." (${input.issues[i].issueType})`
      );
    }

    context.logger.info(
      `[${FILTER_NAME}] Checking ${input.issues.length} issues for support elsewhere`
    );

    // If no issues, return empty result
    if (input.issues.length === 0) {
      return {
        unsupportedIssues: [],
        supportedIssues: [],
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
        : truncateDocumentForContext(input.documentText, {
            evidenceKeywords: EVIDENCE_KEYWORDS,
          });

    const userPrompt = `Search this document for support for the flagged issues:

**Full Document**:
${docForPrompt}

**Issues to Check**:

${formattedIssues}

For each issue, determine if it is supported elsewhere in the document.`;

    try {
      // Always prepend date context to prevent false positives on recent dates
      const basePrompt = input.customPrompt || DEFAULT_SUPPORTED_ELSEWHERE_SYSTEM_PROMPT;
      const result = await callLLMFilter<FilterResults>(
        {
          model: input.model,
          modelEnvVar: "FALLACY_FILTER_MODEL",
          systemPrompt: withDateContext(basePrompt),
          userPrompt,
          temperature: input.temperature ?? DEFAULT_TEMPERATURE,
          reasoning: input.reasoning as ReasoningConfig | undefined,
          provider: input.provider as ProviderPreferences | undefined,
          toolName: "supported_elsewhere_results",
          toolDescription: "Results of checking each issue for support elsewhere",
          toolSchema,
          filterName: FILTER_NAME,
        },
        context
      );

      // Process results
      const unsupportedIssues: SupportedElsewhereResult[] = [];
      const supportedIssues: SupportedElsewhereResult[] = [];

      for (const r of result.toolResult.results) {
        // Validate index is in range
        if (r.index < 0 || r.index >= input.issues.length) {
          context.logger.warn(`[${FILTER_NAME}] Invalid index ${r.index}, skipping`);
          continue;
        }

        const filterResult: SupportedElsewhereResult = {
          index: r.index,
          isSupported: r.isSupported,
          supportLocation: r.supportLocation,
          explanation: r.explanation,
        };

        if (r.isSupported) {
          supportedIssues.push(filterResult);
        } else {
          unsupportedIssues.push(filterResult);
        }
      }

      context.logger.info(
        `[${FILTER_NAME}] ${supportedIssues.length}/${input.issues.length} issues filtered (supported elsewhere), ${unsupportedIssues.length} kept`
      );

      // Debug logging
      for (const issue of unsupportedIssues) {
        context.logger.debug(
          `[${FILTER_NAME}] Issue ${issue.index} NOT SUPPORTED: ${issue.explanation}`
        );
      }
      for (const issue of supportedIssues) {
        context.logger.debug(
          `[${FILTER_NAME}] Issue ${issue.index} SUPPORTED at "${issue.supportLocation || "N/A"}": ${issue.explanation}`
        );
      }

      if (result.unifiedUsage) {
        context.logger.debug(
          `[${FILTER_NAME}] Cost: $${result.unifiedUsage.costUsd.toFixed(6)}`
        );
      }

      return {
        unsupportedIssues,
        supportedIssues,
        unifiedUsage: result.unifiedUsage,
        actualApiParams: result.actualApiParams,
        responseMetrics: result.responseMetrics,
      };
    } catch (error) {
      context.logger.error(`[${FILTER_NAME}] Filter failed:`, error);
      // Fallback: assume all issues are unsupported (keep them)
      return {
        unsupportedIssues: input.issues.map((_, idx) => ({
          index: idx,
          isSupported: false,
          explanation: "Fallback: filter failed, preserving issue",
        })),
        supportedIssues: [],
      };
    }
  }
}

export const supportedElsewhereFilterTool = new SupportedElsewhereFilterTool();
export default supportedElsewhereFilterTool;
