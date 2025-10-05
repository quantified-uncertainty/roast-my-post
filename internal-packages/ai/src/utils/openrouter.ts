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
  GPT_5: 'openai/gpt-5',
  DEEPSEEK_CHAT_V3_1_FREE: 'deepseek/deepseek-chat-v3.1:free',
  GROK_4: 'x-ai/grok-4',

  // High performance - Established strong models
  CLAUDE_3_5_SONNET: 'anthropic/claude-3.5-sonnet',
  CLAUDE_3_7_SONNET: 'anthropic/claude-3-7-sonnet-20250219',
  GPT_4_TURBO: 'openai/gpt-4-turbo',
  GPT_4_1_MINI: 'openai/gpt-4.1-mini-2025-04-14',
  GROK_BETA: 'x-ai/grok-beta',

  // Good value - Fast and cost-effective
  CLAUDE_HAIKU: 'anthropic/claude-3-haiku',
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
