/**
 * OpenRouter client factory with Helicone integration
 * Provides unified access to multiple LLM providers (Anthropic, OpenAI, xAI, etc.)
 */

import { OpenAI } from 'openai';
import { aiConfig } from '../config';
import { getCurrentHeliconeHeaders } from '../helicone/simpleSessionManager';

export interface OpenRouterOptions {
  apiKey?: string;
  includeSessionHeaders?: boolean;
}

/**
 * Create an OpenAI client configured for OpenRouter with Helicone proxy
 * Supports all models available via OpenRouter (Claude, GPT, Grok, etc.)
 */
export function createOpenRouterClient(options: OpenRouterOptions = {}): OpenAI {
  const apiKey = options.apiKey || process.env.OPENROUTER_API_KEY || '';

  if (!apiKey || apiKey === 'your_openrouter_api_key_here') {
    throw new Error(
      'OpenRouter API key is required. ' +
      'Please set OPENROUTER_API_KEY in your .env.local file with a valid API key from https://openrouter.ai/'
    );
  }

  const heliconeKey = aiConfig.helicone.apiKey || process.env.HELICONE_API_KEY;

  // Determine environment for better tracking
  const isProduction = process.env.NODE_ENV === 'production';
  const environment = isProduction ? 'Prod' : 'Dev';
  const appTitle = `RoastMyPost Tools - ${environment}`;
  const referer = isProduction ? 'https://roastmypost.org' : 'http://localhost:3000';

  // Build default headers
  const defaultHeaders: Record<string, string> = {
    'HTTP-Referer': referer,
    'X-Title': appTitle,
    'X-Environment': environment,
  };

  // Add session headers if requested
  if (options.includeSessionHeaders !== false) {
    const sessionHeaders = getCurrentHeliconeHeaders();
    Object.assign(defaultHeaders, sessionHeaders);
  }

  // Use Helicone proxy if available, otherwise direct OpenRouter
  if (heliconeKey) {
    return new OpenAI({
      baseURL: 'https://openrouter.helicone.ai/api/v1',
      apiKey,
      defaultHeaders: {
        'Helicone-Auth': `Bearer ${heliconeKey}`,
        ...defaultHeaders,
      }
    });
  } else {
    return new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey,
      defaultHeaders,
    });
  }
}

/**
 * Common OpenRouter model identifiers
 * Top models selected for reasoning, analysis, and evaluation tasks
 */
export const OPENROUTER_MODELS = {
  // Top tier - Latest and most capable models (2025)
  CLAUDE_SONNET_4_5: 'anthropic/claude-sonnet-4.5',
  CLAUDE_SONNET_4: 'anthropic/claude-sonnet-4',
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
  CLAUDE_3_5_HAIKU: 'anthropic/claude-3.5-haiku-20241022',
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
  return 'openai'; // Default fallback to OpenAI's range
}

/**
 * Normalize temperature from user-facing 0-1 scale to provider-specific range
 * @param userTemp - User-provided temperature (0-1 scale)
 * @param modelId - Full model ID to determine provider
 * @returns Actual temperature value for the provider's API
 *
 * @example
 * normalizeTemperature(0.7, 'anthropic/claude-3-haiku') // Returns 0.7 (Anthropic max is 1.0)
 * normalizeTemperature(0.7, 'openai/gpt-4') // Returns 1.4 (OpenAI max is 2.0)
 */
export function normalizeTemperature(userTemp: number, modelId: string): number {
  const provider = getProviderFromModel(modelId);
  const range = PROVIDER_TEMPERATURE_RANGES[provider];
  return userTemp * range.max;
}
