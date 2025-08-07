// Core types for AI package
import { aiConfig } from './config';

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
export const ANALYSIS_MODEL = aiConfig.analysisModel;

// Configuration for creating Anthropic client - use centralized config
export function getAnthropicApiKey(): string | undefined {
  const apiKey = aiConfig.anthropicApiKey;
  if (!apiKey && !aiConfig.isBrowser()) {
    console.error('ERROR: ANTHROPIC_API_KEY is not set');
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
    errors.push('ANTHROPIC_API_KEY is required');
  }

  // Check Helicone configuration consistency
  if (aiConfig.helicone.enabled && !aiConfig.helicone.apiKey) {
    errors.push('HELICONE_CACHE_ENABLED is true but HELICONE_API_KEY is not set');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}