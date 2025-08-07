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
export const ANALYSIS_MODEL = typeof process !== 'undefined' && process.env?.ANALYSIS_MODEL 
  ? process.env.ANALYSIS_MODEL 
  : "claude-sonnet-4-20250514";

// Configuration for creating Anthropic client
export function getAnthropicApiKey(): string | undefined {
  const apiKey = typeof process !== 'undefined' ? process.env?.ANTHROPIC_API_KEY : undefined;
  if (!apiKey) {
    console.error('ERROR: ANTHROPIC_API_KEY is not set');
  }
  return apiKey;
}

export function getHeliconeApiKey(): string | undefined {
  return typeof process !== 'undefined' ? process.env?.HELICONE_API_KEY : undefined;
}

export function isHeliconeEnabled(): boolean {
  return typeof process !== 'undefined' && process.env?.HELICONE_CACHE_ENABLED === "true";
}

export function getHeliconeMaxAge(): string {
  const maxAge = typeof process !== 'undefined' ? process.env?.HELICONE_CACHE_MAX_AGE : undefined;
  if (maxAge) {
    const parsed = parseInt(maxAge, 10);
    if (isNaN(parsed) || parsed <= 0) {
      console.warn(`Invalid HELICONE_CACHE_MAX_AGE value: ${maxAge}, using default 3600`);
      return "3600";
    }
    return maxAge;
  }
  return "3600"; // Default: 1 hour
}

export function getHeliconeMaxSize(): string {
  const maxSize = typeof process !== 'undefined' ? process.env?.HELICONE_CACHE_BUCKET_MAX_SIZE : undefined;
  if (maxSize) {
    const parsed = parseInt(maxSize, 10);
    if (isNaN(parsed) || parsed <= 0) {
      console.warn(`Invalid HELICONE_CACHE_BUCKET_MAX_SIZE value: ${maxSize}, using default 20`);
      return "20";
    }
    return maxSize;
  }
  return "20"; // Default: 20 items
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

  // Check required configurations - fail fast
  if (!getAnthropicApiKey()) {
    errors.push('ANTHROPIC_API_KEY is required');
  }

  // Check Helicone configuration consistency
  if (isHeliconeEnabled() && !getHeliconeApiKey()) {
    errors.push('HELICONE_CACHE_ENABLED is true but HELICONE_API_KEY is not set');
  }

  // Validate numeric configurations
  const maxAge = typeof process !== 'undefined' ? process.env?.HELICONE_CACHE_MAX_AGE : undefined;
  if (maxAge) {
    const parsed = parseInt(maxAge, 10);
    if (isNaN(parsed) || parsed <= 0) {
      errors.push(`Invalid HELICONE_CACHE_MAX_AGE value: ${maxAge} (must be a positive number)`);
    }
  }

  const maxSize = typeof process !== 'undefined' ? process.env?.HELICONE_CACHE_BUCKET_MAX_SIZE : undefined;
  if (maxSize) {
    const parsed = parseInt(maxSize, 10);
    if (isNaN(parsed) || parsed <= 0) {
      errors.push(`Invalid HELICONE_CACHE_BUCKET_MAX_SIZE value: ${maxSize} (must be a positive number)`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}