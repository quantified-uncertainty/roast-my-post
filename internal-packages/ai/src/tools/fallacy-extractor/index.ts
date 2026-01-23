import { z } from "zod";

import {
  ISSUE_TYPES,
} from "../../analysis-plugins/plugins/fallacy-check/constants";
import { callClaudeWithTool } from "../../claude/wrapper";
import { callOpenRouterWithTool } from "../../utils/openrouter";
import {
  Tool,
  ToolContext,
} from "../base/Tool";
import { fallacyExtractorConfig } from "../configs";
import { generateCacheSeed } from "../shared/cache-utils";
import { withDateContext } from "../shared/llm-filter-utils";
import fuzzyTextLocatorTool from "../smart-text-searcher";
import { findLocationInChunk } from "../smart-text-searcher/chunk-location-finder";
import type { UnifiedUsageMetrics } from "../../utils/usageMetrics";
import type {
  FallacyExtractorInput,
  FallacyExtractorOutput,
  ExtractedFallacyIssue,
  ActualApiParams,
  ApiResponseMetrics,
} from "./types";
import {
  DEFAULT_EXTRACTOR_SYSTEM_PROMPT,
  DEFAULT_EXTRACTOR_USER_PROMPT,
} from "./prompts";

// Removed severity-calibration and genre imports - we trust the LLM's scores

// Zod schemas
const extractedFallacyIssueSchema = z.object({
  exactText: z
    .string()
    .describe("The EXACT text from the document that has the epistemic issue"),
  issueType: z
    .enum([
      ISSUE_TYPES.MISINFORMATION,
      ISSUE_TYPES.MISSING_CONTEXT,
      ISSUE_TYPES.DECEPTIVE_WORDING,
      ISSUE_TYPES.LOGICAL_FALLACY,
      ISSUE_TYPES.VERIFIED_ACCURATE,
    ] as const)
    .describe("Type of epistemic issue identified"),
  fallacyType: z
    .enum([
      "ad-hominem",
      "straw-man",
      "false-dilemma",
      "slippery-slope",
      "appeal-to-authority",
      "appeal-to-emotion",
      "appeal-to-nature",
      "hasty-generalization",
      "survivorship-bias",
      "selection-bias",
      "cherry-picking",
      "circular-reasoning",
      "equivocation",
      "non-sequitur",
      "other",
    ] as const)
    .optional()
    .describe("Specific fallacy type (only for logical-fallacy issues)"),
  severityScore: z
    .number()
    .min(0)
    .max(100)
    .describe("Severity score from 0-100 (higher = more severe)"),
  confidenceScore: z
    .number()
    .min(0)
    .max(100)
    .describe("Confidence score from 0-100 (higher = more confident this is the fallacy)"),
  reasoning: z
    .string()
    .describe("Detailed reasoning for why this is an issue"),
  importanceScore: z
    .number()
    .min(0)
    .max(100)
    .describe("How important to address (0-100)"),
  approximateLineNumber: z
    .number()
    .optional()
    .describe("Approximate line number where this text appears (helps with faster location finding)"),
}) satisfies z.ZodType<ExtractedFallacyIssue>;

const inputSchema = z.object({
  text: z.string().max(50000).optional().describe("Text chunk to analyze (optional if documentText provided)"),
  documentText: z.string().optional().describe("Full document text - used for analysis in single-pass mode, or for location finding in chunk mode"),
  chunkStartOffset: z.number().min(0).optional().describe("Byte offset where this chunk starts in the full document (optimization for location finding)"),
  model: z.string().optional().describe("Model to use (Claude or OpenRouter model ID)"),
  temperature: z.union([
    z.number().min(0).max(2),
    z.literal('default'),
  ]).optional().describe("Temperature for extraction (default: 0 for Claude, 0.1 for OpenRouter, 'default' to use model's native default)"),
  thinking: z.boolean().optional().describe("Enable extended thinking/reasoning (default: true for Claude, varies for OpenRouter)"),
  customSystemPrompt: z.string().optional().describe("Custom system prompt override"),
  customUserPrompt: z.string().optional().describe("Custom user prompt override (document text appended)"),
  minSeverityThreshold: z.number().min(0).max(100).optional().describe("Minimum severity threshold (default: 60)"),
  maxIssues: z.number().min(1).max(100).optional().describe("Maximum issues to return (default: 15)"),
}) satisfies z.ZodType<FallacyExtractorInput>;

const outputSchema = z.object({
  issues: z.array(extractedFallacyIssueSchema).describe("Array of extracted epistemic issues with severity, confidence, and importance scores"),
  totalIssuesFound: z.number().describe("Total number of potential issues found before filtering"),
  wasComplete: z.boolean().describe("Whether the analysis was complete or had to be truncated due to length"),
}) satisfies z.ZodType<FallacyExtractorOutput>;

export class FallacyExtractorTool extends Tool<
  FallacyExtractorInput,
  FallacyExtractorOutput
> {
  config = fallacyExtractorConfig;
  inputSchema = inputSchema;
  outputSchema = outputSchema;

  async execute(
    input: FallacyExtractorInput,
    context: ToolContext
  ): Promise<FallacyExtractorOutput> {
    const executionStartTime = Date.now();

    // Configuration - use input overrides or defaults
    const MIN_SEVERITY_THRESHOLD = input.minSeverityThreshold ?? 60;
    const MAX_ISSUES = input.maxIssues ?? 15;

    // Use documentText for analysis if text is not provided (single-pass mode)
    // This allows callers to just pass documentText for full-document analysis
    const textToAnalyze = input.text || input.documentText || "";

    // Prompt version for tracking - update this when prompt changes
    const PROMPT_VERSION = "v2-justification-check";

    // Determine which model to use:
    // 1. input.model (explicit override)
    // 2. FALLACY_EXTRACTOR_MODEL env var (for testing different models)
    // 3. Default (Claude via callClaudeWithTool which uses its own default)
    const modelId = input.model || process.env.FALLACY_EXTRACTOR_MODEL || undefined;
    const isOpenRouterModel = modelId?.includes("/") || false; // OpenRouter models have format "provider/model"

    // Debug logging for development
    context.logger.debug(
      `[FallacyExtractor] Running: model=${modelId || "default"} (${isOpenRouterModel ? "OpenRouter" : "Claude"}), mode=${input.text ? "chunk" : "single-pass"}, docLength=${textToAnalyze.length}`
    );

    // Audit log: Tool execution started
    context.logger.info(
      "[FallacyExtractor] AUDIT: Tool execution started",
      {
        timestamp: new Date().toISOString(),
        promptVersion: PROMPT_VERSION,
        textLength: textToAnalyze.length,
        textPreview: textToAnalyze.substring(0, 100),
        minSeverityThreshold: MIN_SEVERITY_THRESHOLD,
        maxIssues: MAX_ISSUES,
        hasDocumentText: !!input.documentText,
        hasChunkOffset: input.chunkStartOffset !== undefined,
        mode: input.text ? "chunk" : "single-pass",
      }
    );

    context.logger.info(
      `[FallacyExtractor] PROMPT_VERSION=${PROMPT_VERSION} MODE=${input.text ? "chunk" : "single-pass"} DOC_LENGTH=${textToAnalyze.length}`
    );

    // Use custom prompts if provided, otherwise use defaults from prompts.ts
    // Always prepend date context to prevent false positives on recent dates
    const baseSystemPrompt = input.customSystemPrompt || DEFAULT_EXTRACTOR_SYSTEM_PROMPT;
    const systemPrompt = withDateContext(baseSystemPrompt);
    const userPrompt = input.customUserPrompt
      ? `${input.customUserPrompt}\n\n${textToAnalyze}`
      : `${DEFAULT_EXTRACTOR_USER_PROMPT}\n\n${textToAnalyze}`;

    const cacheSeed = generateCacheSeed("fallacy-extract", [
      textToAnalyze,
      MIN_SEVERITY_THRESHOLD,
      MAX_ISSUES,
    ]);

    // Shared tool schema for both Claude and OpenRouter
    const toolSchema = {
      type: "object" as const,
      properties: {
        issues: {
          type: "array",
          items: {
            type: "object",
            properties: {
              exactText: {
                type: "string",
                description: "The exact text from the document",
              },
              issueType: {
                type: "string",
                enum: [
                  ISSUE_TYPES.MISINFORMATION,
                  ISSUE_TYPES.MISSING_CONTEXT,
                  ISSUE_TYPES.DECEPTIVE_WORDING,
                  ISSUE_TYPES.LOGICAL_FALLACY,
                  ISSUE_TYPES.VERIFIED_ACCURATE,
                ],
                description: "Type of issue",
              },
              fallacyType: {
                type: "string",
                enum: [
                  "ad-hominem",
                  "straw-man",
                  "false-dilemma",
                  "slippery-slope",
                  "appeal-to-authority",
                  "appeal-to-emotion",
                  "appeal-to-nature",
                  "hasty-generalization",
                  "survivorship-bias",
                  "selection-bias",
                  "cherry-picking",
                  "circular-reasoning",
                  "equivocation",
                  "non-sequitur",
                  "other",
                ],
                description: "Specific fallacy type (only for logical-fallacy issues)",
              },
              severityScore: {
                type: "number",
                description: "0-100: How severe is this issue",
              },
              confidenceScore: {
                type: "number",
                description: "0-100: How confident you are this is the fallacy",
              },
              reasoning: {
                type: "string",
                description: "Why this is an issue",
              },
              importanceScore: {
                type: "number",
                description: "0-100: How important to address",
              },
              approximateLineNumber: {
                type: "number",
                description: "Approximate line number where this text appears (optional, helps speed up location finding)",
              },
            },
            required: [
              "exactText",
              "issueType",
              "severityScore",
              "confidenceScore",
              "reasoning",
              "importanceScore",
            ],
          },
        },
        wasComplete: {
          type: "boolean",
          description: "Whether analysis was complete or had to be truncated",
        },
      },
      required: ["issues", "wasComplete"],
    };

    type ExtractorResults = {
      issues: ExtractedFallacyIssue[];
      wasComplete: boolean;
    };

    type ExtractorCallResult = {
      toolResult: ExtractorResults;
      actualParams?: ActualApiParams;
      responseMetrics?: ApiResponseMetrics;
      unifiedUsage?: UnifiedUsageMetrics;
    };

    let result: ExtractorCallResult;
    let actualApiParams: ActualApiParams | undefined;
    let responseMetrics: ApiResponseMetrics | undefined;
    let unifiedUsage: UnifiedUsageMetrics | undefined;

    // Determine temperature to use:
    // - "default": Don't pass temperature, let model use its native default
    // - undefined: Use our model-specific default (0 for Claude, 0.1 for OpenRouter)
    // - number: Use explicit value
    const useDefaultTemperature = input.temperature === 'default';
    const defaultTemp = isOpenRouterModel ? 0.1 : 0;
    const temperature = useDefaultTemperature ? undefined : (typeof input.temperature === 'number' ? input.temperature : defaultTemp);

    // Thinking parameter: undefined/true = enabled, false = disabled
    const thinkingEnabled = input.thinking !== false;

    // For Anthropic models, convert reasoning effort to budget_tokens
    // Anthropic supports up to 128K thinking tokens
    const ANTHROPIC_MAX_THINKING_TOKENS = 128000;
    const EFFORT_PERCENTAGES: Record<string, number> = {
      minimal: 0.1,
      low: 0.3,
      medium: 0.5,
      high: 0.7,
      xhigh: 0.9,
    };

    // Calculate thinking config for Claude based on reasoning effort
    const getClaudeThinkingConfig = (): boolean | { type: 'enabled'; budget_tokens: number } => {
      if (!thinkingEnabled) return false;

      // Only set explicit budget if effort level is specified
      if (input.reasoningEffort && input.reasoningEffort !== 'none') {
        const percentage = EFFORT_PERCENTAGES[input.reasoningEffort];
        if (percentage) {
          const budgetTokens = Math.floor(ANTHROPIC_MAX_THINKING_TOKENS * percentage);
          return { type: 'enabled' as const, budget_tokens: budgetTokens };
        }
      }

      // No effort specified - just return true, let wrapper use its default
      return true;
    };

    if (isOpenRouterModel && modelId) {
      // Use OpenRouter for non-Claude models (Gemini, GPT, etc.)
      const providerInfo = input.provider?.order ? `, provider: [${input.provider.order.join(', ')}]` : '';
      context.logger.debug(`[FallacyExtractor] Calling OpenRouter: model=${modelId}, temp=${temperature ?? 'default'}, thinking=${thinkingEnabled}, reasoningEffort=${input.reasoningEffort ?? 'not set'}${providerInfo}`);
      const openRouterResult = await callOpenRouterWithTool<ExtractorResults>({
        model: modelId,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
        max_tokens: 8000,
        ...(temperature !== undefined && { temperature }),
        toolName: "extract_fallacy_issues",
        toolDescription: "Extract and score fallacy issues from text",
        toolSchema,
        thinking: thinkingEnabled,
        // Pass explicit reasoning effort if provided (from profile config)
        ...(input.reasoningEffort !== undefined && { reasoningEffort: input.reasoningEffort }),
        // Pass provider preferences if specified
        ...(input.provider && { provider: input.provider }),
      });
      result = openRouterResult;
      // Capture actual API params from OpenRouter response
      actualApiParams = {
        model: openRouterResult.actualParams.model,
        temperature: openRouterResult.actualParams.temperature,
        maxTokens: openRouterResult.actualParams.maxTokens,
        reasoning: openRouterResult.actualParams.reasoning,
      };
      responseMetrics = openRouterResult.responseMetrics;
      unifiedUsage = openRouterResult.unifiedUsage;
    } else {
      // Use Claude API directly
      const claudeThinkingConfig = getClaudeThinkingConfig();
      const thinkingBudgetInfo = typeof claudeThinkingConfig === 'object'
        ? `budget: ${claudeThinkingConfig.budget_tokens}`
        : (claudeThinkingConfig ? 'default' : 'disabled');
      console.log(`🤖 Calling Claude API${modelId ? ` with model: ${modelId}` : ""}, temp: ${temperature ?? 'default'}, thinking: ${thinkingBudgetInfo}, reasoningEffort: ${input.reasoningEffort ?? 'not set'}`);
      const claudeResult = await callClaudeWithTool<ExtractorResults>({
        ...(modelId && { model: modelId }),
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
        max_tokens: 8000,
        ...(temperature !== undefined && { temperature }),
        toolName: "extract_fallacy_issues",
        toolDescription: "Extract and score fallacy issues from text",
        toolSchema,
        enablePromptCaching: true,
        cacheSeed,
        thinking: claudeThinkingConfig,
      });
      result = claudeResult;
      // Capture actual API params from Claude response
      actualApiParams = {
        model: claudeResult.actualParams.model,
        temperature: claudeResult.actualParams.temperature,
        maxTokens: claudeResult.actualParams.maxTokens,
        thinking: claudeResult.actualParams.thinking,
      };
      responseMetrics = claudeResult.responseMetrics;
      unifiedUsage = claudeResult.unifiedUsage;
    }

    let allIssues = result.toolResult.issues;
    const wasComplete = result.toolResult.wasComplete;

    // Handle case where LLM returns issues as a JSON string
    if (typeof allIssues === "string") {
      const rawIssuesString: string = allIssues; // Save for error reporting
      context.logger.warn(
        "[FallacyExtractor] Issues returned as string, attempting to parse"
      );
      try {
        allIssues = JSON.parse(allIssues);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        context.logger.error(
          "[FallacyExtractor] Failed to parse issues string:",
          { error: errorMessage, rawValue: rawIssuesString.substring(0, 200) }
        );
        // Don't silently drop results - throw error to surface parsing issue
        throw new Error(
          `Failed to parse LLM response as JSON: ${errorMessage}. This indicates an LLM output format issue that needs investigation.`
        );
      }
    }

    // Ensure allIssues is an array
    if (!Array.isArray(allIssues)) {
      context.logger.error(
        "[FallacyExtractor] Issues is not an array:",
        { type: typeof allIssues, value: allIssues }
      );
      // Don't silently drop results - throw error to surface schema issue
      throw new Error(
        `LLM returned non-array issues (type: ${typeof allIssues}). This indicates an LLM output format issue that needs investigation.`
      );
    }

    // Simple confidence-based filtering: higher severity requires higher confidence
    const getMinConfidence = (severity: number) => {
      if (severity >= 80) return 85;  // CRITICAL issues - highest confidence required
      if (severity >= 60) return 70;  // HIGH issues
      if (severity >= 40) return 50;  // MEDIUM issues
      return 30;                       // LOW issues
    };

    const filteredIssues = allIssues.filter((issue) => {
      // Keep verified-accurate regardless of severity
      if (issue.issueType === ISSUE_TYPES.VERIFIED_ACCURATE) return true;

      // Filter by severity threshold
      if (issue.severityScore < MIN_SEVERITY_THRESHOLD) return false;

      // Apply confidence threshold based on severity
      return issue.confidenceScore >= getMinConfidence(issue.severityScore);
    });

    // Sort by priority: severity × importance (boost verified-accurate claims)
    const sortedIssues = filteredIssues
      .sort((a, b) => {
        const priorityA = a.issueType === ISSUE_TYPES.VERIFIED_ACCURATE
          ? (a.importanceScore || 50) * 50
          : a.severityScore * a.importanceScore;
        const priorityB = b.issueType === ISSUE_TYPES.VERIFIED_ACCURATE
          ? (b.importanceScore || 50) * 50
          : b.severityScore * b.importanceScore;
        return priorityB - priorityA;
      })
      .slice(0, MAX_ISSUES);

    // Find locations for each issue if documentText is provided
    const issuesWithLocations: ExtractedFallacyIssue[] = [];
    if (input.documentText) {
      context.logger.info(`[FallacyExtractor] Finding locations for ${sortedIssues.length} issues`);

      for (const issue of sortedIssues) {
        try {
          let locationResult;

          // OPTIMIZATION: If we have chunk offset, search in chunk first (much faster!)
          if (input.chunkStartOffset !== undefined && input.text) {
            // Use optimized 3-tier chunk-based location finding
            locationResult = await findLocationInChunk(
              {
                chunkText: input.text,
                fullDocumentText: input.documentText || input.text,
                chunkStartOffset: input.chunkStartOffset,
                searchText: issue.exactText,
                lineNumberHint: issue.approximateLineNumber,
              },
              context
            );
          } else if (input.documentText) {
            // No chunk offset, search in full document
            locationResult = await fuzzyTextLocatorTool.execute(
              {
                documentText: input.documentText,
                searchText: issue.exactText,
                lineNumberHint: issue.approximateLineNumber,
                options: {
                  normalizeQuotes: true,
                  partialMatch: false,
                  useLLMFallback: true,
                },
              },
              context
            );
          } else {
            // No document text available for location finding
            issuesWithLocations.push(issue);
            continue;
          }

          if (locationResult.found && locationResult.location) {
            issuesWithLocations.push({
              ...issue,
              location: {
                startOffset: locationResult.location.startOffset,
                endOffset: locationResult.location.endOffset,
                quotedText: locationResult.location.quotedText,
                strategy: locationResult.location.strategy,
                confidence: locationResult.location.confidence,
              },
            });
            context.logger.debug(
              `[FallacyExtractor] Found location for issue using ${locationResult.location.strategy}`
            );
          } else {
            // Keep issue without location
            issuesWithLocations.push(issue);
            context.logger.warn(
              `[FallacyExtractor] Could not find location for issue: "${issue.exactText.substring(0, 50)}..."`
            );
          }
        } catch (error) {
          // Keep issue without location on error
          issuesWithLocations.push(issue);
          context.logger.error(
            `[FallacyExtractor] Error finding location: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }
    } else {
      // No documentText provided, return issues without locations
      issuesWithLocations.push(...sortedIssues);
    }

    const executionDuration = Date.now() - executionStartTime;

    // Audit log: Tool execution completed
    context.logger.info(
      "[FallacyExtractor] AUDIT: Tool execution completed",
      {
        timestamp: new Date().toISOString(),
        executionDurationMs: executionDuration,
        totalIssuesFound: allIssues.length,
        issuesAfterFiltering: filteredIssues.length,
        issuesReturned: issuesWithLocations.length,
        wasComplete,
        issuesWithLocations: issuesWithLocations.filter(i => i.location).length,
        issuesMissingLocations: issuesWithLocations.filter(i => !i.location).length,
      }
    );

    return {
      issues: issuesWithLocations,
      totalIssuesFound: allIssues.length,
      wasComplete,
      actualApiParams,
      responseMetrics,
      unifiedUsage,
    };
  }
}

// Export singleton instance
export const fallacyExtractorTool = new FallacyExtractorTool();
export default fallacyExtractorTool;
