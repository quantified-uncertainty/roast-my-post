// Load environment variables from .env.local first, then .env
import * as dotenv from "dotenv";
import * as path from "path";

// Try to load .env.local first
const envLocalPath = path.join(process.cwd(), ".env.local");
const localResult = dotenv.config({ path: envLocalPath });

// If .env.local doesn't exist or has errors, try .env
if (localResult.error) {
  dotenv.config(); // This loads from default .env
}

import OpenAI from "openai";

import Anthropic from "@anthropic-ai/sdk";

// Read environment variables lazily to allow dotenv loading
function getAnthropicApiKey() {
  return process.env.ANTHROPIC_API_KEY;
}

function getHeliconeApiKey() {
  return process.env.HELICONE_API_KEY;
}

function isHeliconeEnabled() {
  return process.env.HELICONE_CACHE_ENABLED === "true";
}

function getHeliconeMaxAge() {
  return process.env.HELICONE_CACHE_MAX_AGE || "3600";
}

function getHeliconeMaxSize() {
  return process.env.HELICONE_CACHE_BUCKET_MAX_SIZE || "20";
}

function getOpenRouterApiKey() {
  return process.env.OPENROUTER_API_KEY;
}

// Validate API keys only when actually creating clients (not at import time)
function validateAnthropicKey() {
  const key = getAnthropicApiKey();
  if (!key) {
    throw new Error(
      "❌ Missing Anthropic API key. Set ANTHROPIC_API_KEY in .env"
    );
  }
}

function validateOpenRouterKey() {
  const key = getOpenRouterApiKey();
  if (!key) {
    throw new Error(
      "❌ Missing OpenRouter API key. Set OPENROUTER_API_KEY in .env"
    );
  }
}

export const SEARCH_MODEL = process.env.SEARCH_MODEL || "openai/gpt-4.1"; // For search tasks still using OpenRouter
export const ANALYSIS_MODEL = process.env.ANALYSIS_MODEL || "claude-sonnet-4-20250514"; // Using Anthropic directly

// Lazy Anthropic client factory for analysis tasks with Helicone integration
export function createAnthropicClient(additionalHeaders?: Record<string, string>): Anthropic {
  validateAnthropicKey();
  const apiKey = getAnthropicApiKey();
  const heliconeKey = getHeliconeApiKey();
  
  return new Anthropic({
    apiKey: apiKey!,
    ...(heliconeKey && {
      baseURL: "https://anthropic.helicone.ai",
      defaultHeaders: {
        "Helicone-Auth": `Bearer ${heliconeKey}`,
        ...(isHeliconeEnabled() && {
          "Helicone-Cache-Enabled": "true",
          "Cache-Control": `max-age=${getHeliconeMaxAge()}`,
          "Helicone-Cache-Bucket-Max-Size": getHeliconeMaxSize(),
        }),
        ...additionalHeaders
      }
    })
  });
}

// Legacy export for backwards compatibility (but don't initialize at import time)
export const anthropic = {
  messages: {
    create: (params: Anthropic.MessageCreateParams) => createAnthropicClient().messages.create(params)
  }
};

// Lazy OpenAI client factory via OpenRouter for search tasks
export function createOpenAIClient(): OpenAI {
  validateOpenRouterKey();
  const apiKey = getOpenRouterApiKey();
  
  return new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: apiKey!,
    defaultHeaders: {
      "HTTP-Referer": "https://github.com/ozziegooen/roast-my-post",
      "X-Title": "roast-my-post",
    },
  });
}

// Legacy export for backwards compatibility  
export const openai = {
  get chat() {
    return createOpenAIClient().chat;
  }
};

export const DEFAULT_TEMPERATURE = 0.1; // Lower temperature for more deterministic results
export const DEFAULT_TIMEOUT = 300000; // 5 minutes default timeout for LLM requests

// Configurable timeouts via environment variables
export const COMPREHENSIVE_ANALYSIS_TIMEOUT = parseInt(process.env.COMPREHENSIVE_ANALYSIS_TIMEOUT || '600000'); // 10 minutes
export const HIGHLIGHT_EXTRACTION_TIMEOUT = parseInt(process.env.HIGHLIGHT_EXTRACTION_TIMEOUT || '300000'); // 5 minutes
export const SELF_CRITIQUE_TIMEOUT = parseInt(process.env.SELF_CRITIQUE_TIMEOUT || '180000'); // 3 minutes

// Helper function to add timeout to Anthropic requests
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = DEFAULT_TIMEOUT,
  errorMessage: string = "Request timed out"
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(errorMessage)), timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]);
}
