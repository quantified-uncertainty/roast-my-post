/**
 * Supported Elsewhere Filter Tool
 *
 * Checks if claims or arguments flagged as issues are actually supported,
 * explained, or qualified elsewhere in the document. Common in well-structured
 * writing where intro claims are backed up later in the text.
 */

import { z } from "zod";
import { Tool, type ToolContext } from "../base/Tool";
import { callClaudeWithTool } from "../../claude/wrapper";
import { MODEL_CONFIG } from "../../claude/wrapper";
import { callOpenRouterWithTool } from "../../utils/openrouter";
import type {
  SupportedElsewhereFilterInput,
  SupportedElsewhereFilterOutput,
  SupportedElsewhereResult,
  ActualApiParams,
  ApiResponseMetrics,
} from "./types";
import type { UnifiedUsageMetrics } from "../../utils/usageMetrics";
import { effortToBudgetTokens } from "../../types/common";
import { DEFAULT_SUPPORTED_ELSEWHERE_SYSTEM_PROMPT } from "./prompts";

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

// Tool config
const supportedElsewhereFilterConfig = {
  id: "supported-elsewhere-filter",
  name: "Supported Elsewhere Filter",
  description: "Checks if flagged issues are supported elsewhere in the document",
  version: "1.0.0",
  category: "utility" as const,
};

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
    // Determine which model to use:
    // 1. input.model (explicit override)
    // 2. FALLACY_FILTER_MODEL env var (for testing different models)
    // 3. Default Claude analysis model
    const modelId = input.model || process.env.FALLACY_FILTER_MODEL || MODEL_CONFIG.analysis;
    const isOpenRouterModel = modelId.includes("/"); // OpenRouter models have format "provider/model"

    console.log(`\n\n🔍🔍🔍 SUPPORTED-ELSEWHERE FILTER RUNNING 🔍🔍🔍`);
    console.log(`Model: ${modelId} (${isOpenRouterModel ? "OpenRouter" : "Claude"})`);
    console.log(`Checking ${input.issues.length} issues for support elsewhere`);
    for (let i = 0; i < input.issues.length; i++) {
      console.log(`  Issue ${i}: "${input.issues[i].quotedText.substring(0, 60)}..."`);
      console.log(`    Type: ${input.issues[i].issueType}`);
    }
    console.log(`🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍\n`);

    context.logger.info(
      `[SupportedElsewhereFilter] Checking ${input.issues.length} issues for support elsewhere`
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

    // Use custom prompt if provided, otherwise use default
    const systemPrompt = input.customPrompt || DEFAULT_SUPPORTED_ELSEWHERE_SYSTEM_PROMPT;

    // Temperature defaults to 0.1 for precise filtering
    const temperature = input.temperature ?? 0.1;

    // For longer documents, we need to be strategic about what we show the LLM
    // Show the full document if short, otherwise provide structured chunks
    const docForPrompt = input.documentText.length <= 15000
      ? input.documentText
      : this.extractKeySections(input.documentText);

    const userPrompt = `Search this document for support for the flagged issues:

**Full Document**:
${docForPrompt}

**Issues to Check**:

${formattedIssues}

For each issue, determine if it is supported elsewhere in the document.`;

    // Shared tool schema for both Claude and OpenRouter
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

    try {
      let result: {
        toolResult: FilterResults;
        unifiedUsage?: UnifiedUsageMetrics;
        actualApiParams?: ActualApiParams;
        responseMetrics?: ApiResponseMetrics;
      };

      if (isOpenRouterModel) {
        // Use OpenRouter for non-Claude models (Gemini, GPT, etc.)
        // Use higher max_tokens for OpenRouter models (some need more space)

        // Determine reasoning settings for OpenRouter
        const thinkingEnabled = input.reasoning !== undefined && input.reasoning !== false;
        const reasoningEffort = thinkingEnabled && input.reasoning && "effort" in input.reasoning
          ? input.reasoning.effort
          : undefined;

        const reasoningInfo = reasoningEffort ? `, reasoning: ${reasoningEffort}` : '';
        console.log(`📡 Calling OpenRouter API with model: ${modelId}, temp: ${temperature}${reasoningInfo}`);

        const openRouterResult = await callOpenRouterWithTool<FilterResults>({
          model: modelId,
          system: systemPrompt,
          messages: [{ role: "user", content: userPrompt }],
          max_tokens: 8000,
          temperature,
          toolName: "supported_elsewhere_results",
          toolDescription: "Results of checking each issue for support elsewhere",
          toolSchema,
          thinking: thinkingEnabled,
          ...(reasoningEffort && { reasoningEffort }),
          ...(input.provider && { provider: input.provider }),
        });
        result = {
          toolResult: openRouterResult.toolResult,
          unifiedUsage: openRouterResult.unifiedUsage,
          actualApiParams: {
            model: openRouterResult.actualParams.model,
            temperature: openRouterResult.actualParams.temperature ?? 0,
            maxTokens: openRouterResult.actualParams.maxTokens,
            reasoning: openRouterResult.actualParams.reasoning,
          },
          responseMetrics: {
            success: openRouterResult.responseMetrics.success,
            latencyMs: openRouterResult.responseMetrics.latencyMs,
            inputTokens: openRouterResult.responseMetrics.inputTokens,
            outputTokens: openRouterResult.responseMetrics.outputTokens,
            stopReason: openRouterResult.responseMetrics.stopReason,
          },
        };
      } else {
        // Use Claude API directly
        // Build thinking config from reasoning settings
        let thinkingConfig: { type: "enabled"; budget_tokens: number } | undefined;

        if (input.reasoning !== undefined && input.reasoning !== false) {
          if ("effort" in input.reasoning) {
            thinkingConfig = {
              type: "enabled",
              budget_tokens: effortToBudgetTokens(input.reasoning.effort),
            };
          } else if ("budget_tokens" in input.reasoning) {
            thinkingConfig = {
              type: "enabled",
              budget_tokens: input.reasoning.budget_tokens,
            };
          }
        }

        console.log(`🤖 Calling Claude API with model: ${modelId}, temp: ${temperature}, thinking: ${thinkingConfig ? `enabled (${thinkingConfig.budget_tokens} tokens)` : 'disabled'}`);

        const claudeResult = await callClaudeWithTool<FilterResults>({
          model: modelId,
          system: systemPrompt,
          messages: [{ role: "user", content: userPrompt }],
          max_tokens: 4000,
          temperature,
          toolName: "supported_elsewhere_results",
          toolDescription: "Results of checking each issue for support elsewhere",
          toolSchema,
          thinking: thinkingConfig,
        });
        result = {
          toolResult: claudeResult.toolResult,
          unifiedUsage: claudeResult.unifiedUsage,
          actualApiParams: {
            model: modelId,
            temperature: temperature,
            maxTokens: 4000,
            reasoning: thinkingConfig ? { max_tokens: thinkingConfig.budget_tokens } : undefined,
          },
          responseMetrics: {
            success: true,
            latencyMs: 0, // Claude wrapper doesn't expose latency
            inputTokens: claudeResult.unifiedUsage?.inputTokens,
            outputTokens: claudeResult.unifiedUsage?.outputTokens,
            stopReason: 'tool_use',
          },
        };
      }

      // Process results
      const unsupportedIssues: SupportedElsewhereResult[] = [];
      const supportedIssues: SupportedElsewhereResult[] = [];

      for (const r of result.toolResult.results || []) {
        // Validate index is in range
        if (r.index < 0 || r.index >= input.issues.length) {
          context.logger.warn(`[SupportedElsewhereFilter] Invalid index ${r.index}, skipping`);
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

      console.log(`\n\n✅✅✅ SUPPORTED-ELSEWHERE FILTER RESULTS ✅✅✅`);
      console.log(`KEPT (unsupported): ${unsupportedIssues.length} issues`);
      for (const issue of unsupportedIssues) {
        console.log(`  Issue ${issue.index}: NOT supported`);
        console.log(`    Reason: ${issue.explanation}`);
      }
      console.log(`FILTERED (supported): ${supportedIssues.length} issues`);
      for (const issue of supportedIssues) {
        console.log(`  Issue ${issue.index}: SUPPORTED at "${issue.supportLocation || 'N/A'}"`);
        console.log(`    Reason: ${issue.explanation}`);
      }
      console.log(`✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅\n\n`);

      context.logger.info(
        `[SupportedElsewhereFilter] ${supportedIssues.length}/${input.issues.length} issues filtered (supported elsewhere), ${unsupportedIssues.length} kept`
      );

      if (result.unifiedUsage) {
        console.log(`💰 Filter cost: $${result.unifiedUsage.costUsd?.toFixed(6) || 'N/A'}`);
      }

      return {
        unsupportedIssues,
        supportedIssues,
        unifiedUsage: result.unifiedUsage,
        actualApiParams: result.actualApiParams,
        responseMetrics: result.responseMetrics,
      };
    } catch (error) {
      context.logger.error("[SupportedElsewhereFilter] Filter failed:", error);
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

  /**
   * Extract key sections from a long document for analysis.
   * Prioritizes intro, conclusion, and sections with evidence-related keywords.
   */
  private extractKeySections(documentText: string): string {
    const lines = documentText.split("\n");
    const chunks: string[] = [];

    // Always include first ~2000 chars (intro)
    chunks.push("**[INTRO/BEGINNING]**\n" + documentText.substring(0, 2000));

    // Always include last ~2000 chars (conclusion)
    if (documentText.length > 4000) {
      chunks.push("**[CONCLUSION/END]**\n" + documentText.substring(documentText.length - 2000));
    }

    // Find sections with evidence-related keywords
    const evidenceKeywords = [
      "method", "data", "result", "study", "research", "evidence",
      "citation", "reference", "source", "appendix", "table", "figure",
      "analysis", "finding", "sample", "participant", "measure",
      "because", "therefore", "thus", "since", "reason", "explain"
    ];

    let currentSection = "";
    let sectionHasEvidence = false;

    for (const line of lines) {
      const lowerLine = line.toLowerCase();

      // Check if this line or section contains evidence keywords
      if (evidenceKeywords.some(kw => lowerLine.includes(kw))) {
        sectionHasEvidence = true;
      }

      // Check for section headers (markdown or uppercase)
      if (line.startsWith("#") || line.match(/^[A-Z][A-Z\s]{3,}$/)) {
        if (sectionHasEvidence && currentSection.length > 100) {
          chunks.push("**[EVIDENCE SECTION]**\n" + currentSection.substring(0, 1500));
        }
        currentSection = line + "\n";
        sectionHasEvidence = false;
      } else {
        currentSection += line + "\n";
      }
    }

    // Don't exceed ~12000 chars total
    let result = chunks.join("\n\n---\n\n");
    if (result.length > 12000) {
      result = result.substring(0, 12000) + "\n...[truncated]...";
    }

    return result;
  }
}

export const supportedElsewhereFilterTool = new SupportedElsewhereFilterTool();
export default supportedElsewhereFilterTool;
