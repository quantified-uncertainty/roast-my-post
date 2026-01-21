/**
 * OpenRouter Direct API Client
 *
 * Uses direct HTTP calls instead of OpenAI SDK for full control over
 * OpenRouter-specific parameters like reasoning_effort.
 *
 * API Docs: https://openrouter.ai/docs/api/reference/parameters
 */

import { aiConfig } from '../config';
import { getCurrentHeliconeHeaders } from '../helicone/simpleSessionManager';
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

// ============================================================================
// Types
// ============================================================================

/**
 * Reasoning effort levels supported by OpenRouter
 * - "none": Disable reasoning entirely
 * - "minimal": ~10% of max_tokens for reasoning
 * - "low": ~20% of max_tokens for reasoning
 * - "medium": ~50% of max_tokens for reasoning
 * - "high": ~80% of max_tokens for reasoning
 * - "xhigh": ~95% of max_tokens for reasoning
 */
export type ReasoningEffort = 'none' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh';

/**
 * Reasoning configuration for fine-grained control
 */
export interface ReasoningConfig {
  /** Effort level (alternative to max_tokens) */
  effort?: ReasoningEffort;
  /** Direct token budget for reasoning */
  max_tokens?: number;
  /** Whether to exclude reasoning from response */
  exclude?: boolean;
  /** Enable reasoning with defaults */
  enabled?: boolean;
}

/**
 * OpenRouter chat message
 */
export interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_call_id?: string;
}

/**
 * Tool/function definition
 */
export interface OpenRouterTool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

/**
 * Tool choice configuration
 */
export type OpenRouterToolChoice =
  | 'none'
  | 'auto'
  | 'required'
  | { type: 'function'; function: { name: string } };

/**
 * OpenRouter API request body
 */
export interface OpenRouterRequest {
  model: string;
  messages: OpenRouterMessage[];

  // Generation parameters
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  top_k?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  repetition_penalty?: number;
  min_p?: number;
  top_a?: number;
  seed?: number;
  stop?: string[];

  // Tool calling
  tools?: OpenRouterTool[];
  tool_choice?: OpenRouterToolChoice;
  parallel_tool_calls?: boolean;

  // Reasoning control (OpenRouter-specific)
  reasoning_effort?: ReasoningEffort;
  reasoning?: ReasoningConfig;

  // Output format
  response_format?: { type: 'json_object' | 'text' };

  // Provider-specific passthrough
  provider?: {
    order?: string[];
    allow_fallbacks?: boolean;
    require_parameters?: boolean;
  };
}

/**
 * Tool call in response
 */
export interface OpenRouterToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

/**
 * Response choice
 */
export interface OpenRouterChoice {
  index: number;
  message: {
    role: 'assistant';
    content: string | null;
    tool_calls?: OpenRouterToolCall[];
  };
  finish_reason: 'stop' | 'tool_calls' | 'length' | 'content_filter' | null;
}

/**
 * Token usage with full cost details from OpenRouter
 */
export interface OpenRouterUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cost?: number;
  is_byok?: boolean;
  prompt_tokens_details?: {
    cached_tokens?: number;
    audio_tokens?: number;
    video_tokens?: number;
  };
  cost_details?: {
    upstream_inference_cost?: number | null;
    upstream_inference_prompt_cost?: number;
    upstream_inference_completions_cost?: number;
  };
  completion_tokens_details?: {
    reasoning_tokens?: number;
    image_tokens?: number;
  };
}

/**
 * OpenRouter API response
 */
export interface OpenRouterResponse {
  id: string;
  model: string;
  provider?: string;  // Which provider handled the request (e.g., "Google AI Studio", "Cerebras")
  object: 'chat.completion';
  created: number;
  choices: OpenRouterChoice[];
  usage?: OpenRouterUsage;
}

/**
 * API error response
 */
export interface OpenRouterError {
  error: {
    message: string;
    type: string;
    code?: string;
  };
}

// ============================================================================
// Client Configuration
// ============================================================================

export interface OpenRouterClientOptions {
  apiKey?: string;
  includeSessionHeaders?: boolean;
}

/**
 * Get the base URL for OpenRouter API (with optional Helicone proxy)
 */
function getBaseUrl(): string {
  const heliconeKey = aiConfig.helicone.apiKey || process.env.HELICONE_API_KEY;
  return heliconeKey
    ? 'https://openrouter.helicone.ai/api/v1'
    : 'https://openrouter.ai/api/v1';
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

  const heliconeKey = aiConfig.helicone.apiKey || process.env.HELICONE_API_KEY;
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

  // Add Helicone auth if available
  if (heliconeKey) {
    headers['Helicone-Auth'] = `Bearer ${heliconeKey}`;
  }

  // Add session headers if requested
  if (options.includeSessionHeaders !== false) {
    const sessionHeaders = getCurrentHeliconeHeaders();
    Object.assign(headers, sessionHeaders);
  }

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

  // Log the ACTUAL request being sent to OpenRouter
  console.log(`📡 [OpenRouter] ACTUAL REQUEST:`, JSON.stringify({
    model: request.model,
    max_tokens: request.max_tokens,
    temperature: request.temperature,
    reasoning: request.reasoning,
    reasoning_effort: request.reasoning_effort,
    tool_choice: request.tool_choice,
    provider: request.provider,
    tools: request.tools?.map(t => t.function.name),
    messages_count: request.messages?.length,
  }));

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ error: { message: response.statusText } })) as OpenRouterError;
    throw new Error(`OpenRouter API error (${response.status}): ${errorBody.error?.message || response.statusText}`);
  }

  return response.json() as Promise<OpenRouterResponse>;
}

// ============================================================================
// High-Level Chat Interface (no tools)
// ============================================================================

/**
 * Provider routing configuration
 */
export interface ProviderPreferences {
  /** Ordered list of preferred providers (e.g., ["anthropic", "google"]) */
  order?: string[];
  /** Allow fallback to other providers if preferred ones fail */
  allow_fallbacks?: boolean;
  /** Require all parameters to be supported by provider */
  require_parameters?: boolean;
}

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
      role: m.role as 'system' | 'user' | 'assistant',
      content: m.content,
    })),
    max_tokens: options.max_tokens || 4000,
    temperature: options.temperature,
    response_format: options.response_format,
  };

  // Use the `reasoning` object format which is more widely supported than `reasoning_effort`
  if (options.reasoningEffort) {
    request.reasoning = { effort: options.reasoningEffort };
  }

  if (options.provider) {
    request.provider = options.provider;
  }

  console.log(`📡 [OpenRouter] Chat: ${options.model}${options.reasoningEffort ? `, reasoning.effort: ${options.reasoningEffort}` : ''}`);

  // Build custom client options with extra headers if provided
  const clientOptions: OpenRouterClientOptions = {};

  // Capture timing for unified metrics
  const startTime = Date.now();
  const response = await callOpenRouter(request, clientOptions);
  const latencyMs = Date.now() - startTime;

  const choice = response.choices[0];
  if (!choice) {
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
    effectiveMaxTokens = budgetResult.maxTokens;

    console.log(`📡 [OpenRouter] Reasoning budget resolved: effort=${reasoningEffort}, maxTokens=${effectiveMaxTokens}, budget=${budgetResult.displayBudget}, usesExplicit=${budgetResult.usesExplicitBudget}`);
  }

  // Build request
  // Only set temperature if explicitly provided - otherwise let model use its native default
  const effectiveTemperature = options.temperature !== undefined
    ? normalizeTemperature(options.temperature, options.model)
    : undefined;

  const request: OpenRouterRequest = {
    model: options.model,
    messages: [
      { role: 'system', content: options.system },
      ...options.messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
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
    tool_choice: reasoningEffort !== undefined
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

  const choice = response.choices[0];
  if (!choice) {
    throw new Error('No response from OpenRouter');
  }

  // Detect truncation and invalidate cache for future requests
  if (choice.finish_reason === 'length') {
    console.warn(`⚠️ [OpenRouter] Response truncated for ${options.model} - invalidating endpoints cache`);
    invalidateEndpointsCache(options.model);
  }

  // Check for tool call
  const toolCall = choice.message?.tool_calls?.[0];
  if (!toolCall || toolCall.function.name !== options.toolName) {
    // Log what we actually got for debugging
    console.error(`[OpenRouter] Expected tool call '${options.toolName}' but got:`);
    console.error(`  finish_reason: ${choice.finish_reason}`);
    console.error(`  message.content: ${choice.message?.content?.substring(0, 500) || '(empty)'}`);
    console.error(`  tool_calls: ${JSON.stringify(choice.message?.tool_calls || [])}`);

    // Provide specific error for finish_reason: length
    if (choice.finish_reason === 'length') {
      throw new Error(`Response truncated (max_tokens too small) - model ${options.model} ran out of tokens before completing the tool call. Consider using a lower reasoning effort level.`);
    }
    throw new Error(`No tool call found for ${options.toolName}`);
  }

  // Parse the tool arguments
  let toolResult: T;
  try {
    toolResult = JSON.parse(toolCall.function.arguments) as T;
  } catch (e) {
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
    stopReason: choice.finish_reason ?? undefined,
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

// ============================================================================
// Model Configuration
// ============================================================================

/**
 * Common OpenRouter model identifiers
 * Top models selected for reasoning, analysis, and evaluation tasks
 */
export const OPENROUTER_MODELS = {
  // Top tier - Latest and most capable models (2025)
  CLAUDE_SONNET_4_5: 'anthropic/claude-sonnet-4.5',
  CLAUDE_SONNET_4: 'anthropic/claude-sonnet-4',
  GEMINI_3_PRO: 'google/gemini-3-pro-preview',
  GEMINI_3_FLASH: 'google/gemini-3-flash-preview',
  GEMINI_2_5_PRO: 'google/gemini-2.5-pro',
  GEMINI_2_5_FLASH: 'google/gemini-2.5-flash',
  GPT_5: 'openai/gpt-5',
  GPT_5_MINI: 'openai/gpt-5-mini',
  DEEPSEEK_CHAT_V3_1: 'deepseek/deepseek-chat-v3.1',
  GROK_4: 'x-ai/grok-4',

  // High performance - Established strong models
  CLAUDE_3_5_SONNET: 'anthropic/claude-3.5-sonnet',
  CLAUDE_3_7_SONNET: 'anthropic/claude-3-7-sonnet-20250219',
  GPT_4_TURBO: 'openai/gpt-4-turbo',
  GPT_4_1: 'openai/gpt-4.1',
  GPT_4_1_MINI: 'openai/gpt-4.1-mini-2025-04-14',
  GROK_BETA: 'x-ai/grok-beta',

  // Good value - Fast and cost-effective
  CLAUDE_HAIKU: 'anthropic/claude-3-haiku',
  CLAUDE_HAIKU_4_5: 'anthropic/claude-haiku-4.5',
  GPT_35_TURBO: 'openai/gpt-3.5-turbo',
  DEEPSEEK_CHAT: 'deepseek/deepseek-chat',

  // Legacy/Alternative options
  CLAUDE_OPUS: 'anthropic/claude-3-opus',
  CLAUDE_4_SONNET_20250522: 'anthropic/claude-4-sonnet-20250522',
  GPT_4: 'openai/gpt-4',
  GEMINI_PRO: 'google/gemini-pro',
  LLAMA_70B: 'meta-llama/llama-3-70b-instruct',
} as const;

export type OpenRouterModel = typeof OPENROUTER_MODELS[keyof typeof OPENROUTER_MODELS];

// ============================================================================
// Temperature Utilities
// ============================================================================

/**
 * Temperature range configuration by provider
 * Different providers support different temperature ranges
 */
export const PROVIDER_TEMPERATURE_RANGES = {
  anthropic: { min: 0, max: 1.0 },
  openai: { min: 0, max: 2.0 },
  google: { min: 0, max: 2.0 },
  'x-ai': { min: 0, max: 2.0 },
  deepseek: { min: 0, max: 2.0 },
  'z-ai': { min: 0, max: 1.5 },
  // Default for unknown providers - use conservative max
  default: { min: 0, max: 1.5 },
} as const;

export type ProviderName = keyof typeof PROVIDER_TEMPERATURE_RANGES;

/**
 * Extract provider name from OpenRouter model ID
 * @param modelId - Full model ID (e.g., "anthropic/claude-3-haiku")
 * @returns Provider name (e.g., "anthropic")
 */
export function getProviderFromModel(modelId: string): ProviderName {
  if (modelId.includes('claude') || modelId.startsWith('anthropic/')) return 'anthropic';
  if (modelId.includes('gpt') || modelId.includes('openai') || modelId.startsWith('openai/')) return 'openai';
  if (modelId.includes('gemini') || modelId.startsWith('google/')) return 'google';
  if (modelId.includes('grok') || modelId.startsWith('x-ai/')) return 'x-ai';
  if (modelId.includes('deepseek') || modelId.startsWith('deepseek/')) return 'deepseek';
  if (modelId.startsWith('z-ai/')) return 'z-ai';
  return 'default'; // Default fallback to conservative range
}

/**
 * Normalize temperature to the valid range for a given provider.
 *
 * Handles two input conventions:
 * - Values 0-1: Treated as normalized scale, mapped to provider's full range
 * - Values > 1: Treated as actual temperature values, capped to provider max
 *
 * @param userTemp - User-provided temperature (0-1 normalized, or actual value)
 * @param modelId - Full model ID to determine provider
 * @returns Actual temperature value capped to provider's max
 *
 * @example
 * normalizeTemperature(0.7, 'anthropic/claude-3-haiku') // Returns 0.7 (within Anthropic's 0-1 range)
 * normalizeTemperature(0.7, 'openai/gpt-4') // Returns 1.4 (0.7 * 2.0 for OpenAI's 0-2 range)
 * normalizeTemperature(1.5, 'anthropic/claude-3-haiku') // Returns 1.0 (capped to Anthropic max)
 * normalizeTemperature(1.5, 'openai/gpt-4') // Returns 1.5 (within OpenAI's 0-2 range)
 */
export function normalizeTemperature(userTemp: number, modelId: string): number {
  const provider = getProviderFromModel(modelId);
  const range = PROVIDER_TEMPERATURE_RANGES[provider];

  // If value is > 1, treat as actual temperature (don't scale)
  // Just cap to provider max
  if (userTemp > 1) {
    return Math.min(userTemp, range.max);
  }

  // If value is 0-1, scale to provider's range
  return userTemp * range.max;
}

// ============================================================================
// Legacy Exports (for backwards compatibility)
// ============================================================================

// Note: createOpenRouterClient is no longer needed since we use direct HTTP
// but we keep the export for any code that might reference it
export interface OpenRouterOptions {
  apiKey?: string;
  includeSessionHeaders?: boolean;
}
