import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { aiConfig } from "../config";

// Configuration accessors using the centralized config
function getAnthropicApiKey() {
  return aiConfig.anthropicApiKey || process.env.ANTHROPIC_API_KEY;
}

function getOpenRouterApiKey() {
  return process.env.OPENROUTER_API_KEY; // Not in aiConfig yet
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

export const SEARCH_MODEL = process.env.SEARCH_MODEL || 'claude-3-5-sonnet-20241022';
export const ANALYSIS_MODEL = aiConfig.analysisModel;

// Lazy Anthropic client factory for analysis tasks
export function createAnthropicClient(): Anthropic {
  validateAnthropicKey();
  const apiKey = getAnthropicApiKey();
  return new Anthropic({ apiKey: apiKey! });
}

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

export const DEFAULT_TEMPERATURE = 0.1; // Lower temperature for more deterministic results
export const DEFAULT_LLM_TIMEOUT = 300000; // 5 minutes default timeout for LLM requests

// Configurable timeouts via environment variables
export const COMPREHENSIVE_ANALYSIS_TIMEOUT = parseInt(process.env.COMPREHENSIVE_ANALYSIS_TIMEOUT || '600000'); // 10 minutes
export const HIGHLIGHT_EXTRACTION_TIMEOUT = parseInt(process.env.HIGHLIGHT_EXTRACTION_TIMEOUT || '300000'); // 5 minutes
export const SELF_CRITIQUE_TIMEOUT = parseInt(process.env.SELF_CRITIQUE_TIMEOUT || '180000'); // 3 minutes

// Re-export withTimeout from centralized utility for backward compatibility
export { withTimeout } from '../utils/timeout';
