/**
 * AI Package Configuration
 * 
 * This module provides initialization and configuration for the AI package.
 * It ensures that all required environment variables are available and
 * provides a centralized configuration interface.
 */

export interface AIConfig {
  anthropicApiKey?: string;
  heliconeApiKey?: string;
  openaiApiKey?: string;
  environment?: 'development' | 'production' | 'test';
}

let isInitialized = false;
let config: AIConfig = {};

/**
 * Initialize the AI package with configuration
 * 
 * @param aiConfig Configuration options for the AI package
 */
export function initializeAI(aiConfig: AIConfig = {}): void {
  // Merge provided config with environment variables
  config = {
    anthropicApiKey: aiConfig.anthropicApiKey || process.env.ANTHROPIC_API_KEY,
    heliconeApiKey: aiConfig.heliconeApiKey || process.env.HELICONE_API_KEY,
    openaiApiKey: aiConfig.openaiApiKey || process.env.OPENAI_API_KEY,
    environment: aiConfig.environment || (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development',
    ...aiConfig,
  };

  isInitialized = true;
}

/**
 * Get the current AI configuration
 * 
 * @returns The current AI configuration
 * @throws Error if the package hasn't been initialized
 */
export function getAIConfig(): AIConfig {
  if (!isInitialized) {
    // Auto-initialize with defaults if not already done
    initializeAI();
  }
  return config;
}

/**
 * Check if the AI package has been initialized
 * 
 * @returns True if initialized, false otherwise
 */
export function isAIInitialized(): boolean {
  return isInitialized;
}

/**
 * Reset the AI configuration (mainly for testing)
 */
export function resetAIConfig(): void {
  isInitialized = false;
  config = {};
}