// Core types for AI package

export type LLMRole = "system" | "user" | "assistant";

export interface LLMMessage {
  role: LLMRole;
  content: string;
}

export interface LLMUsage {
  input_tokens: number;
  output_tokens: number;
}

// Rich LLMInteraction format - used by Claude wrapper for detailed tracking
export interface RichLLMInteraction {
  model: string;
  prompt: string;
  response: string;
  tokensUsed: {
    prompt: number;
    completion: number;
    total: number;
  };
  timestamp: Date;
  duration: number;
}

// Model configuration
export const ANALYSIS_MODEL = process.env.ANALYSIS_MODEL || "claude-sonnet-4-20250514";

// Configuration for creating Anthropic client
export function getAnthropicApiKey() {
  return process.env.ANTHROPIC_API_KEY;
}

export function getHeliconeApiKey() {
  return process.env.HELICONE_API_KEY;
}

export function isHeliconeEnabled() {
  return process.env.HELICONE_CACHE_ENABLED === "true";
}

export function getHeliconeMaxAge() {
  return process.env.HELICONE_CACHE_MAX_AGE || "3600";
}

export function getHeliconeMaxSize() {
  return process.env.HELICONE_CACHE_BUCKET_MAX_SIZE || "20";
}