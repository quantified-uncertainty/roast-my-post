/**
 * AI Package Configuration
 * Centralized configuration for AI/LLM services
 */

// Simple browser check for the AI package
const isBrowser = typeof window !== 'undefined';

/**
 * Get environment variable with fallback
 */
function getEnv(key: string, fallback?: string): string | undefined {
  if (isBrowser) return fallback;
  return process.env[key] || fallback;
}

/**
 * AI Configuration
 * Uses getters to ensure environment variables are read lazily
 */
export const aiConfig = {
  // Model configuration
  get analysisModel(): string {
    return getEnv('ANALYSIS_MODEL', 'claude-sonnet-4-20250514') as string;
  },
  
  // API Keys
  get anthropicApiKey(): string | undefined {
    return getEnv('ANTHROPIC_API_KEY');
  },
  get openaiApiKey(): string | undefined {
    return getEnv('OPENAI_API_KEY');
  },
  
  // Helicone configuration
  get helicone() {
    return {
      apiKey: getEnv('HELICONE_API_KEY'),
      enabled: getEnv('HELICONE_CACHE_ENABLED') === 'true',
      cacheMaxAge: parseInt(getEnv('HELICONE_CACHE_MAX_AGE', '86400') || '86400', 10),
      cacheBucketMaxSize: parseInt(getEnv('HELICONE_CACHE_BUCKET_MAX_SIZE', '10') || '10', 10),
    };
  },
  
  // Validation
  validate(): void {
    if (!isBrowser && !this.anthropicApiKey && !this.openaiApiKey) {
      throw new Error('At least one AI API key (ANTHROPIC_API_KEY or OPENAI_API_KEY) is required');
    }
  },
  
  // Check if running in browser
  isBrowser: () => isBrowser,
  
  // Require server environment
  requireServer(): void {
    if (isBrowser) {
      throw new Error('This operation requires a server environment');
    }
  }
};

/**
 * AI Configuration interface for initialization
 */
export interface AIConfig {
  anthropicApiKey?: string;
  openRouterApiKey?: string;
  openaiApiKey?: string;
  heliconeApiKey?: string;
  heliconeEnabled?: boolean;
  heliconeMaxAge?: string;
  heliconeMaxSize?: string;
  searchModel?: string;
  analysisModel?: string;
}

/**
 * Initialize AI configuration with external values
 * This allows the web app to pass configuration to the AI package
 */
export function initializeAI(config: AIConfig): void {
  // Store the provided config values by updating environment variables
  // Note: This approach works for Node.js environments
  if (config.anthropicApiKey) process.env.ANTHROPIC_API_KEY = config.anthropicApiKey;
  if (config.openRouterApiKey) process.env.OPENROUTER_API_KEY = config.openRouterApiKey;
  if (config.openaiApiKey) process.env.OPENAI_API_KEY = config.openaiApiKey;
  if (config.heliconeApiKey) process.env.HELICONE_API_KEY = config.heliconeApiKey;
  if (config.heliconeEnabled !== undefined) process.env.HELICONE_CACHE_ENABLED = String(config.heliconeEnabled);
  if (config.heliconeMaxAge) process.env.HELICONE_CACHE_MAX_AGE = config.heliconeMaxAge;
  if (config.heliconeMaxSize) process.env.HELICONE_CACHE_BUCKET_MAX_SIZE = config.heliconeMaxSize;
  if (config.searchModel) process.env.SEARCH_MODEL = config.searchModel;
  if (config.analysisModel) process.env.ANALYSIS_MODEL = config.analysisModel;
}