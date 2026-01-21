/**
 * Principle of Charity Filter Tool
 *
 * Applies the principle of charity - interpreting arguments in their strongest,
 * most reasonable form before critiquing. Filters out issues that don't hold
 * when the author's argument is charitably interpreted.
 */

import { z } from "zod";
import { Tool, type ToolContext } from "../base/Tool";
import { callClaudeWithTool } from "../../claude/wrapper";
import { MODEL_CONFIG } from "../../claude/wrapper";
import { callOpenRouterWithTool } from "../../utils/openrouter";
import type {
  PrincipleOfCharityFilterInput,
  PrincipleOfCharityFilterOutput,
  CharityFilterResult,
  ActualApiParams,
  ApiResponseMetrics,
} from "./types";
import type { UnifiedUsageMetrics } from "../../utils/usageMetrics";
import { effortToBudgetTokens } from "../../types/common";
import { DEFAULT_PRINCIPLE_OF_CHARITY_SYSTEM_PROMPT } from "./prompts";
import { principleOfCharityFilterConfig } from "./config";

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
    // Determine which model to use
    const modelId = input.model || process.env.CHARITY_FILTER_MODEL || MODEL_CONFIG.analysis;
    const isOpenRouterModel = modelId.includes("/");

    console.log(`\n\n🤝🤝🤝 PRINCIPLE OF CHARITY FILTER RUNNING 🤝🤝🤝`);
    console.log(`Model: ${modelId} (${isOpenRouterModel ? "OpenRouter" : "Claude"})`);
    console.log(`Evaluating ${input.issues.length} issues with principle of charity`);
    for (let i = 0; i < input.issues.length; i++) {
      console.log(`  Issue ${i}: "${input.issues[i].quotedText.substring(0, 60)}..."`);
      console.log(`    Type: ${input.issues[i].issueType}`);
    }
    console.log(`🤝🤝🤝🤝🤝🤝🤝🤝🤝🤝🤝🤝🤝🤝🤝🤝🤝🤝🤝🤝\n`);

    context.logger.info(
      `[PrincipleOfCharityFilter] Evaluating ${input.issues.length} issues with principle of charity`
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

    // Use custom prompt if provided, otherwise use default
    const systemPrompt = input.customPrompt || DEFAULT_PRINCIPLE_OF_CHARITY_SYSTEM_PROMPT;

    // Temperature defaults to 0.2 for thoughtful analysis
    const temperature = input.temperature ?? 0.2;

    // For longer documents, show relevant context
    const docForPrompt = input.documentText.length <= 15000
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

    try {
      let result: {
        toolResult: FilterResults;
        unifiedUsage?: UnifiedUsageMetrics;
        actualApiParams?: ActualApiParams;
        responseMetrics?: ApiResponseMetrics;
      };

      if (isOpenRouterModel) {
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
          toolName: "principle_of_charity_results",
          toolDescription: "Results of evaluating issues with principle of charity",
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
          toolName: "principle_of_charity_results",
          toolDescription: "Results of evaluating issues with principle of charity",
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
      const validIssues: CharityFilterResult[] = [];
      const dissolvedIssues: CharityFilterResult[] = [];

      for (const r of result.toolResult.results || []) {
        // Validate index is in range
        if (r.index < 0 || r.index >= input.issues.length) {
          context.logger.warn(`[PrincipleOfCharityFilter] Invalid index ${r.index}, skipping`);
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

      console.log(`\n\n✅✅✅ PRINCIPLE OF CHARITY FILTER RESULTS ✅✅✅`);
      console.log(`KEPT (remain valid): ${validIssues.length} issues`);
      for (const issue of validIssues) {
        console.log(`  Issue ${issue.index}: REMAINS VALID`);
        console.log(`    Charitable interpretation: ${issue.charitableInterpretation.substring(0, 100)}...`);
        console.log(`    Reason: ${issue.explanation.substring(0, 100)}...`);
      }
      console.log(`FILTERED (dissolved): ${dissolvedIssues.length} issues`);
      for (const issue of dissolvedIssues) {
        console.log(`  Issue ${issue.index}: DISSOLVED`);
        console.log(`    Charitable interpretation: ${issue.charitableInterpretation.substring(0, 100)}...`);
        console.log(`    Reason: ${issue.explanation.substring(0, 100)}...`);
      }
      console.log(`✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅\n\n`);

      context.logger.info(
        `[PrincipleOfCharityFilter] ${dissolvedIssues.length}/${input.issues.length} issues dissolved (filtered out), ${validIssues.length} remain valid`
      );

      if (result.unifiedUsage) {
        console.log(`💰 Charity filter cost: $${result.unifiedUsage.costUsd?.toFixed(6) || 'N/A'}`);
      }

      return {
        validIssues,
        dissolvedIssues,
        unifiedUsage: result.unifiedUsage,
        actualApiParams: result.actualApiParams,
        responseMetrics: result.responseMetrics,
      };
    } catch (error) {
      context.logger.error("[PrincipleOfCharityFilter] Filter failed:", error);
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
  private extractRelevantContext(documentText: string, issues: PrincipleOfCharityFilterInput['issues']): string {
    const chunks: string[] = [];

    // Always include first ~2000 chars (intro/context)
    chunks.push("**[INTRODUCTION]**\n" + documentText.substring(0, 2000));

    // Include context around each issue
    for (const issue of issues) {
      if (issue.locationOffset !== undefined) {
        const start = Math.max(0, issue.locationOffset - 500);
        const end = Math.min(documentText.length, issue.locationOffset + issue.quotedText.length + 500);
        chunks.push(`**[CONTEXT FOR: "${issue.quotedText.substring(0, 50)}..."]**\n` + documentText.substring(start, end));
      }
    }

    // Always include last ~1500 chars (conclusion)
    if (documentText.length > 3500) {
      chunks.push("**[CONCLUSION]**\n" + documentText.substring(documentText.length - 1500));
    }

    // Don't exceed ~12000 chars total
    let result = chunks.join("\n\n---\n\n");
    if (result.length > 12000) {
      result = result.substring(0, 12000) + "\n...[truncated]...";
    }

    return result;
  }
}

export const principleOfCharityFilterTool = new PrincipleOfCharityFilterTool();
export default principleOfCharityFilterTool;
