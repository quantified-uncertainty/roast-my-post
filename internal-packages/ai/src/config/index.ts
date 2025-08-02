/**
 * AI Package Configuration
 * 
 * This module provides configuration management for the AI package.
 * Instead of loading environment variables directly, we expect the
 * consuming application to provide configuration through initialization.
 */

export interface AIConfig {
  anthropicApiKey?: string;
  openRouterApiKey?: string;
  heliconeApiKey?: string;
  heliconeEnabled?: boolean;
  heliconeMaxAge?: string;
  heliconeMaxSize?: string;
  searchModel?: string;
  analysisModel?: string;
}

// Internal configuration state
let config: AIConfig = {};

/**
 * Initialize the AI package with configuration
 * Should be called by the consuming application on startup
 */
export function initializeAI(newConfig: AIConfig): void {
  config = { ...config, ...newConfig };
}

/**
 * Get the current configuration
 */
export function getConfig(): Readonly<AIConfig> {
  return config;
}

/**
 * Get a specific configuration value with validation
 */
export function getRequiredConfig<K extends keyof AIConfig>(key: K): NonNullable<AIConfig[K]> {
  const value = config[key];
  if (value === undefined || value === null) {
    throw new Error(
      `Missing required configuration: ${key}. Please ensure initializeAI() is called with proper configuration.`
    );
  }
  return value as NonNullable<AIConfig[K]>;
}

/**
 * Get an optional configuration value with a default
 */
export function getOptionalConfig<K extends keyof AIConfig>(
  key: K,
  defaultValue: AIConfig[K]
): AIConfig[K] {
  return config[key] ?? defaultValue;
}

// Export default values
export const DEFAULT_SEARCH_MODEL = "openai/gpt-4.1";
export const DEFAULT_ANALYSIS_MODEL = "claude-sonnet-4-20250514";
export const DEFAULT_HELICONE_MAX_AGE = "3600";
export const DEFAULT_HELICONE_MAX_SIZE = "20";