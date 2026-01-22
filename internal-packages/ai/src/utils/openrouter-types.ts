/**
 * OpenRouter Types - Client-safe type definitions
 *
 * These types and constants can be safely imported in browser/client-side code.
 * For actual API functions (callOpenRouter, etc.), use @roast/ai/server
 */

import type { ReasoningEffort } from '../types/common';

// Note: ReasoningEffort is already exported from @roast/ai via types/common.ts
// We just use it here for local type definitions

// ============================================================================
// Types (all client-safe - no runtime dependencies)
// ============================================================================

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
  tools?: OpenRouterTool[];
  tool_choice?: OpenRouterToolChoice;
  parallel_tool_calls?: boolean;
  reasoning_effort?: ReasoningEffort;
  reasoning?: ReasoningConfig;
  response_format?: { type: 'json_object' | 'text' };
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
  provider?: string;
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

/**
 * Provider preferences for routing
 */
export interface ProviderPreferences {
  order?: string[];
  allow_fallbacks?: boolean;
}

// ============================================================================
// Constants (client-safe)
// ============================================================================

/**
 * Common OpenRouter model identifiers
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

  // High performance
  CLAUDE_3_5_SONNET: 'anthropic/claude-3.5-sonnet',
  CLAUDE_3_7_SONNET: 'anthropic/claude-3-7-sonnet-20250219',
  GPT_4_TURBO: 'openai/gpt-4-turbo',
  GPT_4_1: 'openai/gpt-4.1',
  GPT_4_1_MINI: 'openai/gpt-4.1-mini-2025-04-14',
  GROK_BETA: 'x-ai/grok-beta',

  // Good value
  CLAUDE_HAIKU: 'anthropic/claude-3-haiku',
  CLAUDE_HAIKU_4_5: 'anthropic/claude-haiku-4.5',
  GPT_35_TURBO: 'openai/gpt-3.5-turbo',
  DEEPSEEK_CHAT: 'deepseek/deepseek-chat',

  // Legacy/Alternative
  CLAUDE_OPUS: 'anthropic/claude-3-opus',
  CLAUDE_4_SONNET_20250522: 'anthropic/claude-4-sonnet-20250522',
  GPT_4: 'openai/gpt-4',
  GEMINI_PRO: 'google/gemini-pro',
  LLAMA_70B: 'meta-llama/llama-3-70b-instruct',
} as const;

export type OpenRouterModel = typeof OPENROUTER_MODELS[keyof typeof OPENROUTER_MODELS];

/**
 * Temperature range configuration by provider
 */
export const PROVIDER_TEMPERATURE_RANGES = {
  anthropic: { min: 0, max: 1.0 },
  openai: { min: 0, max: 2.0 },
  google: { min: 0, max: 2.0 },
  'x-ai': { min: 0, max: 2.0 },
  deepseek: { min: 0, max: 2.0 },
  'z-ai': { min: 0, max: 1.5 },
  default: { min: 0, max: 1.5 },
} as const;

export type ProviderName = keyof typeof PROVIDER_TEMPERATURE_RANGES;

// ============================================================================
// Utility Functions (client-safe - no async/fetch)
// ============================================================================

/**
 * Extract provider name from OpenRouter model ID
 */
export function getProviderFromModel(modelId: string): ProviderName {
  if (modelId.includes('claude') || modelId.startsWith('anthropic/')) return 'anthropic';
  if (modelId.includes('gpt') || modelId.includes('openai') || modelId.startsWith('openai/')) return 'openai';
  if (modelId.includes('gemini') || modelId.startsWith('google/')) return 'google';
  if (modelId.includes('grok') || modelId.startsWith('x-ai/')) return 'x-ai';
  if (modelId.includes('deepseek') || modelId.startsWith('deepseek/')) return 'deepseek';
  if (modelId.startsWith('z-ai/')) return 'z-ai';
  return 'default';
}

/**
 * Normalize temperature to provider's valid range
 */
export function normalizeTemperature(userTemp: number, modelId: string): number {
  const provider = getProviderFromModel(modelId);
  const range = PROVIDER_TEMPERATURE_RANGES[provider];
  const normalized = Math.max(range.min, Math.min(range.max, userTemp));
  return Number(normalized.toFixed(2));
}
