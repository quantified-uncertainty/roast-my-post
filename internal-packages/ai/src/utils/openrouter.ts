/**
 * OpenRouter Direct API Client
 *
 * Uses direct HTTP calls instead of OpenAI SDK for full control over
 * OpenRouter-specific parameters like reasoning_effort.
 *
 * API Docs: https://openrouter.ai/docs/api/reference/parameters
 */

import { normalizeTemperature } from './openrouter-types';
import { requiresAutoToolChoice, supportsSamplingTemperature } from '../modelDefaults';
import { logger } from '../shared/logger';
import { asProviderAccessError } from '../shared/providerErrors';
import {
  UnifiedUsageMetrics,
  fromOpenRouterUsage,
  OpenRouterRawUsage
} from './usageMetrics';
import {
  resolveReasoningBudget,
  invalidateEndpointsCache,
  type ReasoningBudgetResult,
} from './reasoningBudget';
import type { ReasoningEffort as CommonReasoningEffort } from '../types/common';

// Use the common ReasoningEffort type
export type ReasoningEffort = CommonReasoningEffort;

// ============================================================================
// Types
// ============================================================================

import type {
  OpenRouterRequest, OpenRouterResponse, OpenRouterError, ProviderPreferences,
} from './openrouter-types';
export type {
  ReasoningConfig, OpenRouterMessage, OpenRouterTool, OpenRouterToolChoice,
  OpenRouterRequest, OpenRouterToolCall, OpenRouterChoice, OpenRouterUsage,
  OpenRouterResponse, OpenRouterError, ProviderPreferences,
} from './openrouter-types';

// ============================================================================
// Client Configuration
// ============================================================================

export interface OpenRouterClientOptions {
  apiKey?: string;
}

/**
 * Get the OpenRouter API base URL.
 */
function getBaseUrl(): string {
  return 'https://openrouter.ai/api/v1';
}

/**
 * Build headers for OpenRouter API requests
 */
function buildHeaders(options: OpenRouterClientOptions = {}): Record<string, string> {
  const apiKey = options.apiKey || process.env.OPENROUTER_API_KEY || '';

  if (!apiKey || apiKey === 'your_openrouter_api_key_here') {
    throw new Error(
      'OpenRouter API key is required. ' +
      'Please set OPENROUTER_API_KEY in your .env.local file with a valid API key from https://openrouter.ai/'
    );
  }

  const isProduction = process.env.NODE_ENV === 'production';
  const environment = isProduction ? 'Prod' : 'Dev';
  const appTitle = `RoastMyPost Tools - ${environment}`;
  const referer = isProduction ? 'https://roastmypost.org' : 'http://localhost:3000';

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
    'HTTP-Referer': referer,
    'X-Title': appTitle,
    'X-Environment': environment,
  };

  return headers;
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Make a direct API call to OpenRouter
 */
export async function callOpenRouter(
  request: OpenRouterRequest,
  options: OpenRouterClientOptions = {}
): Promise<OpenRouterResponse> {
  const baseUrl = getBaseUrl();
  const headers = buildHeaders(options);

  // Log request details at debug level
  logger.debug(`[OpenRouter] Request: model=${request.model}, max_tokens=${request.max_tokens}, temp=${request.temperature}, reasoning=${JSON.stringify(request.reasoning)}, tools=[${request.tools?.map(t => t.function.name).join(', ') || ''}]`);

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    let errorMessage = response.statusText;
    let errorDetails = '';

    try {
      const errorBody = JSON.parse(errorText) as OpenRouterError;
      errorMessage = errorBody.error.message || response.statusText;
      // Include full error body for debugging (especially useful for 429 rate limits)
      errorDetails = ` | Full response: ${errorText}`;
    } catch {
      // If not JSON, include raw text
      if (errorText) {
        errorDetails = ` | Response: ${errorText.substring(0, 500)}`;
      }
    }

    const error = Object.assign(
      new Error(`OpenRouter API error (${response.status}): ${errorMessage}${errorDetails}`),
      { status: response.status }
    );
    throw asProviderAccessError(error) ?? error;
  }

  return response.json() as Promise<OpenRouterResponse>;
}

// ============================================================================
// High-Level Chat Interface (no tools)
// ============================================================================

/**
 * Options for simple chat completions (no tool calling)
 */
export interface OpenRouterChatOptions {
  model: string;
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  max_tokens?: number;
  temperature?: number;
  response_format?: { type: 'json_object' | 'text' };

  /**
   * Custom headers to pass to the API (e.g., for cache control)
   */
  headers?: Record<string, string>;

  /**
   * Reasoning control
   */
  reasoningEffort?: ReasoningEffort;

  /**
   * Provider routing preferences
   */
  provider?: ProviderPreferences;
}

export interface OpenRouterChatResult {
  content: string | null;
  reasoning?: string;
  model: string;
  finishReason: string | null;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  /** Unified usage metrics (includes cost, cache tokens, reasoning tokens) */
  unifiedUsage?: UnifiedUsageMetrics;
  /** Provider that handled the request */
  provider?: string;
}

/**
 * Simple chat completion without tool calling
 * For cases like claim-evaluator that just need a text response
 */
export async function callOpenRouterChat(
  options: OpenRouterChatOptions
): Promise<OpenRouterChatResult> {
  const request: OpenRouterRequest = {
    model: options.model,
    messages: options.messages.map(m => ({
      role: m.role,
      content: m.content,
    })),
    max_tokens: options.max_tokens || 4000,
    temperature: supportsSamplingTemperature(options.model) ? options.temperature : undefined,
    response_format: options.response_format,
  };

  // Use the `reasoning` object format which is more widely supported than `reasoning_effort`
  if (options.reasoningEffort) {
    request.reasoning = { effort: options.reasoningEffort };
  }

  if (options.provider) {
    request.provider = options.provider;
  }

  logger.debug(`[OpenRouter] Chat: model=${options.model}${options.reasoningEffort ? `, reasoning.effort=${options.reasoningEffort}` : ''}`);

  // Build custom client options with extra headers if provided
  const clientOptions: OpenRouterClientOptions = {};

  // Capture timing for unified metrics
  const startTime = Date.now();
  const response = await callOpenRouter(request, clientOptions);
  const latencyMs = Date.now() - startTime;

  const choice = response.choices?.[0];
  if (!choice) {
    logger.error('[OpenRouter] No choices in response', { id: response.id, model: response.model, provider: response.provider });
    throw new Error('No response from OpenRouter');
  }

  // Extract reasoning from various model formats
  const message = choice.message as {
    content: string | null;
    reasoning?: string;
    reasoning_content?: string;
  };

  // Build unified usage metrics
  const rawUsage = response.usage as OpenRouterRawUsage | undefined;
  const unifiedUsage = rawUsage
    ? fromOpenRouterUsage(rawUsage, response.provider || 'openrouter', response.model, latencyMs)
    : undefined;

  return {
    content: message.content,
    reasoning: message.reasoning || message.reasoning_content,
    model: response.model,
    finishReason: choice.finish_reason,
    usage: response.usage,
    unifiedUsage,
    provider: response.provider,
  };
}

// ============================================================================
// High-Level Tool Calling Interface
// ============================================================================

/**
 * Options for tool-calling requests
 */
export interface OpenRouterToolCallOptions {
  model: string;
  system: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  max_tokens?: number;
  temperature?: number;
  toolName: string;
  toolDescription: string;
  toolSchema: Record<string, unknown>;

  /**
   * Whether to enable extended thinking/reasoning mode.
   * - true: Enable reasoning (uses model default or "medium" effort)
   * - false: Disable reasoning entirely (reasoning_effort: "none")
   * - undefined: Let model use its default behavior
   */
  thinking?: boolean;

  /**
   * Fine-grained reasoning control (overrides thinking boolean)
   * Use this for explicit control over reasoning effort level.
   */
  reasoningEffort?: ReasoningEffort;

  /**
   * Provider routing preferences
   */
  provider?: ProviderPreferences;
}

/** Actual API params as sent to OpenRouter */
export interface OpenRouterActualParams {
  model: string;
  temperature: number;
  maxTokens: number;
  reasoning?: {
    effort?: ReasoningEffort;
    max_tokens?: number;
  };
}

/** Response metrics from OpenRouter API */
export interface OpenRouterResponseMetrics {
  success: boolean;
  latencyMs: number;
  inputTokens?: number;
  outputTokens?: number;
  stopReason?: string;
  errorType?: string;
  errorMessage?: string;
  /** Full raw usage from OpenRouter (includes cost, cache, reasoning tokens) */
  rawUsage?: OpenRouterRawUsage;
  /** Provider that handled the request (e.g., "Google AI Studio", "Cerebras") */
  provider?: string;
}

export interface OpenRouterToolCallResult<T> {
  toolResult: T;
  model: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  /** Actual params sent to API - captured right before the call */
  actualParams: OpenRouterActualParams;
  /** Response metrics */
  responseMetrics: OpenRouterResponseMetrics;
  /** Unified usage metrics (includes cost, cache tokens, reasoning tokens) */
  unifiedUsage?: UnifiedUsageMetrics;
}

/**
 * Call OpenRouter with tool/function calling
 * Uses direct HTTP for full control over OpenRouter-specific parameters
 */
export async function callOpenRouterWithTool<T>(
  options: OpenRouterToolCallOptions
): Promise<OpenRouterToolCallResult<T>> {
  // Determine reasoning effort
  let reasoningEffort: ReasoningEffort | undefined;

  if (options.reasoningEffort !== undefined) {
    // Explicit reasoning effort takes precedence
    reasoningEffort = options.reasoningEffort;
  } else if (options.thinking === false) {
    // Disable reasoning when thinking is false
    reasoningEffort = 'none';
  }
  // When thinking is true or undefined, don't set reasoning_effort (use model default)

  // Resolve reasoning budget using the new resolver (handles provider-specific limits)
  let budgetResult: ReasoningBudgetResult | undefined;
  let effectiveMaxTokens = options.max_tokens || 4000;

  if (reasoningEffort && reasoningEffort !== 'none') {
    budgetResult = await resolveReasoningBudget({
      effort: reasoningEffort,
      modelId: options.model,
      selectedProviders: options.provider?.order,
    });
    effectiveMaxTokens = budgetResult.usesExplicitBudget ? budgetResult.maxTokens : effectiveMaxTokens;

    logger.debug(`[OpenRouter] Reasoning budget: effort=${reasoningEffort}, maxTokens=${effectiveMaxTokens}, budget=${budgetResult.displayBudget}, usesExplicit=${budgetResult.usesExplicitBudget}`);
  }

  // Build request
  // Only set temperature if explicitly provided - otherwise let model use its native default
  const effectiveTemperature = options.temperature !== undefined && supportsSamplingTemperature(options.model)
    ? normalizeTemperature(options.temperature, options.model)
    : undefined;

  const request: OpenRouterRequest = {
    model: options.model,
    messages: [
      { role: 'system', content: `${options.system}\nReturn the result by calling the ${options.toolName} tool.` },
      ...options.messages.map(m => ({ role: m.role, content: m.content })),
    ],
    max_tokens: effectiveMaxTokens,
    ...(effectiveTemperature !== undefined && { temperature: effectiveTemperature }),
    tools: [
      {
        type: 'function',
        function: {
          name: options.toolName,
          description: options.toolDescription,
          parameters: options.toolSchema,
        },
      },
    ],
    // Tool choice strategy:
    // - Default: Force specific tool for reliability
    // - With reasoning: Use "required" (model must use a tool)
    // - With reasoning + specific provider routing: Use "auto" (some providers like z-ai
    //   don't support "required" combined with reasoning)
    tool_choice: requiresAutoToolChoice(options.model) ? 'auto' : reasoningEffort !== undefined
      ? (options.provider?.order ? 'auto' : 'required')
      : { type: 'function', function: { name: options.toolName } },
  };

  // Add reasoning configuration from budget resolver or simple effort
  if (budgetResult) {
    // Use the resolved reasoning config (may be explicit max_tokens or effort-based)
    request.reasoning = budgetResult.reasoning;
  } else if (reasoningEffort !== undefined) {
    // Fallback for 'none' effort
    request.reasoning = { effort: reasoningEffort };
  }

  // Add provider preferences if specified
  if (options.provider) {
    request.provider = options.provider;
  }

  // Logging is done in callOpenRouter function

  // Capture actual params being sent to API (for telemetry)
  const actualParams: OpenRouterActualParams = {
    model: options.model,
    // Use effectiveTemperature or -1 to indicate "not set" (model uses native default)
    temperature: effectiveTemperature ?? -1,
    maxTokens: request.max_tokens!,
    ...(request.reasoning && { reasoning: request.reasoning }),
  };

  // Capture timing for telemetry
  const apiCallStartTime = Date.now();

  const response = await callOpenRouter(request);
  const latencyMs = Date.now() - apiCallStartTime;

  const choice = response.choices?.[0];
  if (!choice) {
    logger.error('[OpenRouter] No choices in response', { id: response.id, model: response.model, provider: response.provider });
    throw new Error('No response from OpenRouter');
  }

  // Detect truncation and invalidate cache for future requests
  if (choice.finish_reason === 'length') {
    logger.warn(`[OpenRouter] Response truncated for ${options.model} - invalidating endpoints cache`);
    invalidateEndpointsCache(options.model);
  }

  // Check for tool call
  const toolCalls = choice.message.tool_calls;
  const toolCall = toolCalls?.[0];
  if (!toolCall || toolCall.function.name !== options.toolName) {
    logger.error(`[OpenRouter] Expected tool call '${options.toolName}' but got:`, {
      finish_reason: choice.finish_reason,
      message_content: choice.message.content?.substring(0, 500) || '(empty)',
      tool_calls: toolCalls || [],
    });

    if (choice.finish_reason === 'length') {
      throw new Error(`Response truncated (max_tokens too small) - model ${options.model} ran out of tokens before completing the tool call. Consider using a lower reasoning effort level.`);
    }
    throw new Error(`No tool call found for ${options.toolName}`);
  }

  // Parse the tool arguments
  let toolResult: T;
  try {
    toolResult = JSON.parse(toolCall.function.arguments) as T;
  } catch {
    throw new Error(`Failed to parse tool arguments: ${toolCall.function.arguments}`);
  }

  // Cast usage to raw format for unified metrics
  const rawUsage = response.usage as OpenRouterRawUsage | undefined;

  // Build response metrics for telemetry
  const responseMetrics: OpenRouterResponseMetrics = {
    success: true,
    latencyMs,
    inputTokens: response.usage?.prompt_tokens,
    outputTokens: response.usage?.completion_tokens,
    stopReason: choice.finish_reason || undefined,
    rawUsage,
    provider: response.provider,
  };

  // Build unified usage metrics
  const unifiedUsage = rawUsage
    ? fromOpenRouterUsage(rawUsage, response.provider || 'openrouter', response.model, latencyMs)
    : undefined;

  return {
    toolResult,
    model: options.model,
    usage: response.usage ? {
      prompt_tokens: response.usage.prompt_tokens,
      completion_tokens: response.usage.completion_tokens,
      total_tokens: response.usage.total_tokens,
    } : undefined,
    actualParams,
    responseMetrics,
    unifiedUsage,
  };
}

export {
  OPENROUTER_MODELS, PROVIDER_TEMPERATURE_RANGES, getProviderFromModel, normalizeTemperature,
} from './openrouter-types';
export type { OpenRouterModel, ProviderName } from './openrouter-types';
