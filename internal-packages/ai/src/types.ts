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
export function getAnthropicApiKey(): string | undefined {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey && process.env.NODE_ENV === 'production') {
    console.error('WARNING: ANTHROPIC_API_KEY is not set in production environment');
  }
  return apiKey;
}

export function getHeliconeApiKey(): string | undefined {
  return process.env.HELICONE_API_KEY;
}

export function isHeliconeEnabled(): boolean {
  return process.env.HELICONE_CACHE_ENABLED === "true";
}

export function getHeliconeMaxAge(): string {
  const maxAge = process.env.HELICONE_CACHE_MAX_AGE;
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
  const maxSize = process.env.HELICONE_CACHE_BUCKET_MAX_SIZE;
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

  // Check required configurations
  if (!getAnthropicApiKey()) {
    if (process.env.NODE_ENV === 'production') {
      errors.push('ANTHROPIC_API_KEY is required in production');
    } else {
      warnings.push('ANTHROPIC_API_KEY is not set - AI features will not work');
    }
  }

  // Check optional configurations
  if (isHeliconeEnabled() && !getHeliconeApiKey()) {
    warnings.push('HELICONE_CACHE_ENABLED is true but HELICONE_API_KEY is not set');
  }

  // Validate numeric configurations
  const maxAge = process.env.HELICONE_CACHE_MAX_AGE;
  if (maxAge) {
    const parsed = parseInt(maxAge, 10);
    if (isNaN(parsed) || parsed <= 0) {
      warnings.push(`Invalid HELICONE_CACHE_MAX_AGE value: ${maxAge}`);
    }
  }

  const maxSize = process.env.HELICONE_CACHE_BUCKET_MAX_SIZE;
  if (maxSize) {
    const parsed = parseInt(maxSize, 10);
    if (isNaN(parsed) || parsed <= 0) {
      warnings.push(`Invalid HELICONE_CACHE_BUCKET_MAX_SIZE value: ${maxSize}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}