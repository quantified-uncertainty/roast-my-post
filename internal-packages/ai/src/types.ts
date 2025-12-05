// Core types for AI package
import { aiConfig } from "./config";
import { DEFAULT_ANALYSIS_MODEL } from "./constants";

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

// Model configuration - use centralized config
// Note: This is read at import time, so if env vars are set after import, it won't pick them up
// For dynamic reading, use aiConfig.analysisModel directly
export const ANALYSIS_MODEL = DEFAULT_ANALYSIS_MODEL;

// Model ID to display name mapping
export const MODEL_DISPLAY_NAMES: Record<string, string> = {
  "claude-opus-4-5-20251101": "Claude Opus 4.5",
  "claude-sonnet-4-5-20250929": "Claude Sonnet 4.5",
  "claude-haiku-4-5-20251001": "Claude Haiku 4.5",
  "claude-sonnet-4-5": "Claude Sonnet 4.5",
  "claude-sonnet-4": "Claude Sonnet 4",
  "claude-3-5-sonnet-20241022": "Claude 3.5 Sonnet",
  "claude-3-haiku-20240307": "Claude 3 Haiku",
  "claude-3-opus-20240229": "Claude 3 Opus",
};

export function getModelDisplayName(modelId: string): string {
  return MODEL_DISPLAY_NAMES[modelId] || modelId;
}

// Configuration for creating Anthropic client - use centralized config
export function getAnthropicApiKey(): string | undefined {
  const apiKey = aiConfig.anthropicApiKey;
  if (!apiKey && !aiConfig.isBrowser()) {
    console.error("ERROR: ANTHROPIC_API_KEY is not set");
  }
  return apiKey;
}

export function getHeliconeApiKey(): string | undefined {
  return aiConfig.helicone.apiKey;
}

export function isHeliconeEnabled(): boolean {
  return aiConfig.helicone.enabled;
}

export function getHeliconeMaxAge(): string {
  return aiConfig.helicone.cacheMaxAge.toString();
}

export function getHeliconeMaxSize(): string {
  return aiConfig.helicone.cacheBucketMaxSize.toString();
}

// Configuration validation
export interface ConfigValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateConfiguration(): ConfigValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Skip validation in browser
  if (aiConfig.isBrowser()) {
    return { isValid: true, errors, warnings };
  }

  // Check required configurations - fail fast
  if (!aiConfig.anthropicApiKey) {
    errors.push("ANTHROPIC_API_KEY is required");
  }

  // Check Helicone configuration consistency
  if (aiConfig.helicone.enabled && !aiConfig.helicone.apiKey) {
    errors.push(
      "HELICONE_CACHE_ENABLED is true but HELICONE_API_KEY is not set"
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}
