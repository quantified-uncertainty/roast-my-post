/**
 * Shared LLM Filter Utilities
 *
 * Common utilities for LLM-based filter tools. Abstracts away the differences
 * between Claude API and OpenRouter API calls.
 */

import { callClaudeWithTool } from "../../claude/wrapper";
import { MODEL_CONFIG } from "../../claude/wrapper";
import { callOpenRouterWithTool } from "../../utils/openrouter";
import { effortToBudgetTokens } from "../../types/common";
import type { UnifiedUsageMetrics } from "../../utils/usageMetrics";
import type { ToolContext } from "../base/Tool";

// ============================================================================
// Types
// ============================================================================

/** Reasoning configuration (matches common.ts) */
export type ReasoningConfig =
  | false
  | { effort: "minimal" | "low" | "medium" | "high" | "xhigh" }
  | { budget_tokens: number };

/** Provider preferences for OpenRouter */
export interface ProviderPreferences {
  order?: string[];
  allow_fallbacks?: boolean;
}

/** Actual API parameters sent to provider */
export interface ActualApiParams {
  model: string;
  temperature: number;
  maxTokens: number;
  thinking?: {
    type: "enabled";
    budget_tokens: number;
  };
  reasoning?: {
    effort?: "minimal" | "low" | "medium" | "high" | "xhigh";
    max_tokens?: number;
  };
}

/** Response metrics from API call */
export interface ApiResponseMetrics {
  success: boolean;
  latencyMs: number;
  inputTokens?: number;
  outputTokens?: number;
  stopReason?: string;
}

/** Input for LLM filter call */
export interface LLMFilterCallInput {
  /** Model ID (Claude model or OpenRouter format like "provider/model") */
  model?: string;
  /** Environment variable name for model override (e.g., "FALLACY_FILTER_MODEL") */
  modelEnvVar?: string;
  /** System prompt */
  systemPrompt: string;
  /** User prompt */
  userPrompt: string;
  /** Temperature (defaults vary by filter) */
  temperature: number;
  /** Reasoning/thinking configuration */
  reasoning?: ReasoningConfig;
  /** Provider routing preferences (OpenRouter only) */
  provider?: ProviderPreferences;
  /** Tool name for structured output */
  toolName: string;
  /** Tool description for structured output */
  toolDescription: string;
  /** JSON Schema for tool output (must be object type) */
  toolSchema: { type: "object"; properties: Record<string, unknown>; required?: string[] };
  /** Max tokens for response (defaults: Claude=4000, OpenRouter=8000) */
  maxTokens?: { claude?: number; openRouter?: number };
  /** Filter name for logging */
  filterName: string;
}

/** Output from LLM filter call */
export interface LLMFilterCallOutput<T> {
  toolResult: T;
  unifiedUsage?: UnifiedUsageMetrics;
  actualApiParams: ActualApiParams;
  responseMetrics: ApiResponseMetrics;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Detect if model is an OpenRouter model (contains "/" in ID)
 */
export function isOpenRouterModel(modelId: string): boolean {
  return modelId.includes("/");
}

/**
 * Resolve model ID from input, environment variable, or default
 */
export function resolveModelId(
  inputModel: string | undefined,
  envVarName: string | undefined
): string {
  if (inputModel) return inputModel;
  if (envVarName && process.env[envVarName]) return process.env[envVarName]!;
  return MODEL_CONFIG.analysis;
}

/**
 * Build Claude thinking configuration from reasoning settings
 */
export function buildThinkingConfig(
  reasoning: ReasoningConfig | undefined
): { type: "enabled"; budget_tokens: number } | undefined {
  if (reasoning === undefined || reasoning === false) {
    return undefined;
  }

  if ("effort" in reasoning) {
    return {
      type: "enabled",
      budget_tokens: effortToBudgetTokens(reasoning.effort),
    };
  }

  if ("budget_tokens" in reasoning) {
    return {
      type: "enabled",
      budget_tokens: reasoning.budget_tokens,
    };
  }

  return undefined;
}

/**
 * Build OpenRouter reasoning settings from reasoning config
 */
export function buildOpenRouterReasoning(
  reasoning: ReasoningConfig | undefined
): { enabled: boolean; effort?: "minimal" | "low" | "medium" | "high" | "xhigh" } {
  if (reasoning === undefined || reasoning === false) {
    return { enabled: false };
  }

  if ("effort" in reasoning) {
    return { enabled: true, effort: reasoning.effort };
  }

  // For budget_tokens, we don't have a direct mapping to OpenRouter effort,
  // so we enable thinking but don't set a specific effort level
  return { enabled: true };
}

// ============================================================================
// Main LLM Call Function
// ============================================================================

/**
 * Call an LLM (Claude or OpenRouter) with tool use for filter operations.
 *
 * This function abstracts the differences between:
 * - Claude API (direct calls with thinking parameter)
 * - OpenRouter API (with reasoning effort parameter)
 *
 * @example
 * const result = await callLLMFilter<MyToolResult>({
 *   model: "claude-sonnet-4-5-20250929",
 *   systemPrompt: "You are a helpful assistant...",
 *   userPrompt: "Analyze this...",
 *   temperature: 0.1,
 *   reasoning: { effort: "medium" },
 *   toolName: "my_tool",
 *   toolDescription: "Description of output",
 *   toolSchema: { ... },
 *   filterName: "MyFilter",
 * }, context);
 */
export async function callLLMFilter<T>(
  input: LLMFilterCallInput,
  context: ToolContext
): Promise<LLMFilterCallOutput<T>> {
  const modelId = resolveModelId(input.model, input.modelEnvVar);
  const useOpenRouter = isOpenRouterModel(modelId);

  const claudeMaxTokens = input.maxTokens?.claude ?? 4000;
  const openRouterMaxTokens = input.maxTokens?.openRouter ?? 8000;

  context.logger.debug(
    `[${input.filterName}] Calling ${useOpenRouter ? "OpenRouter" : "Claude"}: model=${modelId}, temp=${input.temperature}`
  );

  if (useOpenRouter) {
    return callOpenRouterFilter<T>(input, modelId, openRouterMaxTokens, context);
  } else {
    return callClaudeFilter<T>(input, modelId, claudeMaxTokens, context);
  }
}

/**
 * Call OpenRouter API with tool use
 */
async function callOpenRouterFilter<T>(
  input: LLMFilterCallInput,
  modelId: string,
  maxTokens: number,
  context: ToolContext
): Promise<LLMFilterCallOutput<T>> {
  const { enabled: thinkingEnabled, effort: reasoningEffort } = buildOpenRouterReasoning(input.reasoning);

  const reasoningInfo = reasoningEffort ? `, reasoning: ${reasoningEffort}` : "";
  context.logger.debug(
    `[${input.filterName}] OpenRouter params: model=${modelId}, temp=${input.temperature}${reasoningInfo}`
  );

  const result = await callOpenRouterWithTool<T>({
    model: modelId,
    system: input.systemPrompt,
    messages: [{ role: "user", content: input.userPrompt }],
    max_tokens: maxTokens,
    temperature: input.temperature,
    toolName: input.toolName,
    toolDescription: input.toolDescription,
    toolSchema: input.toolSchema,
    thinking: thinkingEnabled,
    ...(reasoningEffort && { reasoningEffort }),
    ...(input.provider && { provider: input.provider }),
  });

  // Map reasoning effort, filtering out 'none' which isn't valid for ActualApiParams
  const reasoning = result.actualParams.reasoning;
  const mappedReasoning = reasoning && reasoning.effort !== 'none'
    ? { effort: reasoning.effort as Exclude<typeof reasoning.effort, 'none'>, max_tokens: reasoning.max_tokens }
    : reasoning?.max_tokens ? { max_tokens: reasoning.max_tokens } : undefined;

  return {
    toolResult: result.toolResult,
    unifiedUsage: result.unifiedUsage,
    actualApiParams: {
      model: result.actualParams.model,
      temperature: result.actualParams.temperature ?? 0,
      maxTokens: result.actualParams.maxTokens,
      reasoning: mappedReasoning,
    },
    responseMetrics: {
      success: result.responseMetrics.success,
      latencyMs: result.responseMetrics.latencyMs,
      inputTokens: result.responseMetrics.inputTokens,
      outputTokens: result.responseMetrics.outputTokens,
      stopReason: result.responseMetrics.stopReason,
    },
  };
}

/**
 * Call Claude API with tool use
 */
async function callClaudeFilter<T>(
  input: LLMFilterCallInput,
  modelId: string,
  maxTokens: number,
  context: ToolContext
): Promise<LLMFilterCallOutput<T>> {
  const thinkingConfig = buildThinkingConfig(input.reasoning);

  context.logger.debug(
    `[${input.filterName}] Claude params: model=${modelId}, temp=${input.temperature}, thinking=${
      thinkingConfig ? `enabled (${thinkingConfig.budget_tokens} tokens)` : "disabled"
    }`
  );

  const result = await callClaudeWithTool<T>({
    model: modelId,
    system: input.systemPrompt,
    messages: [{ role: "user", content: input.userPrompt }],
    max_tokens: maxTokens,
    temperature: input.temperature,
    toolName: input.toolName,
    toolDescription: input.toolDescription,
    toolSchema: input.toolSchema,
    thinking: thinkingConfig,
  });

  return {
    toolResult: result.toolResult,
    unifiedUsage: result.unifiedUsage,
    actualApiParams: {
      model: modelId,
      temperature: input.temperature,
      maxTokens,
      thinking: thinkingConfig,
      reasoning: thinkingConfig ? { max_tokens: thinkingConfig.budget_tokens } : undefined,
    },
    responseMetrics: {
      success: true,
      latencyMs: 0, // Claude wrapper doesn't expose latency
      inputTokens: result.unifiedUsage?.inputTokens,
      outputTokens: result.unifiedUsage?.outputTokens,
      stopReason: "tool_use",
    },
  };
}

// ============================================================================
// Document Processing Utilities
// ============================================================================

/**
 * Truncate document text for LLM context with key sections preserved.
 * Keeps intro, conclusion, and optionally sections with specific keywords.
 */
export function truncateDocumentForContext(
  documentText: string,
  options: {
    maxLength?: number;
    introLength?: number;
    conclusionLength?: number;
    evidenceKeywords?: string[];
  } = {}
): string {
  const {
    maxLength = 12000,
    introLength = 2000,
    conclusionLength = 2000,
    evidenceKeywords = [],
  } = options;

  // If document is short enough, return as-is
  if (documentText.length <= maxLength) {
    return documentText;
  }

  const chunks: string[] = [];

  // Always include intro
  chunks.push("**[INTRO/BEGINNING]**\n" + documentText.substring(0, introLength));

  // Always include conclusion if document is long enough
  if (documentText.length > introLength + conclusionLength) {
    chunks.push(
      "**[CONCLUSION/END]**\n" +
        documentText.substring(documentText.length - conclusionLength)
    );
  }

  // Find sections with evidence keywords if provided
  if (evidenceKeywords.length > 0) {
    const lines = documentText.split("\n");
    let currentSection = "";
    let sectionHasEvidence = false;

    for (const line of lines) {
      const lowerLine = line.toLowerCase();

      if (evidenceKeywords.some((kw) => lowerLine.includes(kw))) {
        sectionHasEvidence = true;
      }

      // Check for section headers
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
  }

  // Combine and truncate to max length
  let result = chunks.join("\n\n---\n\n");
  if (result.length > maxLength) {
    result = result.substring(0, maxLength) + "\n...[truncated]...";
  }

  return result;
}

// ============================================================================
// Date Context Utilities
// ============================================================================

/**
 * Generate a date context string to prepend to system prompts.
 *
 * This is CRITICAL for preventing false positives where the model thinks
 * recent dates are "in the future" due to training cutoff.
 *
 * @example
 * const prompt = getDateContext() + baseSystemPrompt;
 */
export function getDateContext(): string {
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };
  const formattedDate = now.toLocaleDateString('en-US', options);

  return `**CURRENT DATE**: ${formattedDate}

Use this date as your reference point when evaluating claims about timing and events.

---

`;
}

/**
 * Prepend date context to a system prompt.
 *
 * @param systemPrompt - The base system prompt
 * @returns System prompt with date context prepended
 */
export function withDateContext(systemPrompt: string): string {
  return getDateContext() + systemPrompt;
}
