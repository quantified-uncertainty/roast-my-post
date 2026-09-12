/**
 * AI Package Configuration
 * Centralized configuration for AI/LLM services
 */

import { DEFAULT_ANALYSIS_MODEL } from "./constants";

// Simple browser check for the AI package
const isBrowser = typeof window !== "undefined";

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
    return getEnv("ANALYSIS_MODEL", DEFAULT_ANALYSIS_MODEL) as string;
  },

  // API Keys
  get anthropicApiKey(): string | undefined {
    return getEnv("ANTHROPIC_API_KEY");
  },
  get openaiApiKey(): string | undefined {
    return getEnv("OPENAI_API_KEY");
  },

  // Agentic plugin — workspace cleanup defaults to true to prevent /tmp accumulation.
  // Set AGENTIC_CLEANUP_WORKSPACE=false to preserve workspaces for debugging.
  get agenticCleanupWorkspace(): boolean {
    const val = getEnv("AGENTIC_CLEANUP_WORKSPACE");
    return val !== "false";
  },

  // Validation
  validate(): void {
    if (!isBrowser && !this.anthropicApiKey && !this.openaiApiKey) {
      throw new Error(
        "At least one AI API key (ANTHROPIC_API_KEY or OPENAI_API_KEY) is required"
      );
    }
  },

  // Check if running in browser
  isBrowser: () => isBrowser,

  // Require server environment
  requireServer(): void {
    if (isBrowser) {
      throw new Error("This operation requires a server environment");
    }
  },
};

/**
 * AI Configuration interface for initialization
 */
export interface AIConfig {
  anthropicApiKey?: string;
  openRouterApiKey?: string;
  openaiApiKey?: string;
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
  if (config.anthropicApiKey)
    process.env.ANTHROPIC_API_KEY = config.anthropicApiKey;
  if (config.openRouterApiKey)
    process.env.OPENROUTER_API_KEY = config.openRouterApiKey;
  if (config.openaiApiKey) process.env.OPENAI_API_KEY = config.openaiApiKey;
  if (config.searchModel) process.env.SEARCH_MODEL = config.searchModel;
  if (config.analysisModel) process.env.ANALYSIS_MODEL = config.analysisModel;
}
