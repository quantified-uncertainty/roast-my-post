/**
 * AI Package Initialization
 * 
 * This module initializes the @roast/ai package with configuration
 * from the centralized config system. This should be imported early in the
 * application lifecycle.
 */

import { initializeAI } from '@roast/ai';
import { config } from '@/shared/core/config';
import { isServer } from '@/shared/core/environment';
import { getEnvVar } from '@/shared/core/environment';

// Initialize the AI package with centralized configuration
export function initializeAIPackage() {
  initializeAI({
    anthropicApiKey: config.anthropicApiKey,
    openRouterApiKey: getEnvVar('OPENROUTER_API_KEY'), // Not in config yet
    heliconeApiKey: config.heliconeApiKey,
    heliconeEnabled: config.heliconeEnabled,
    heliconeMaxAge: config.heliconeCacheMaxAge.toString(),
    heliconeMaxSize: config.heliconeCacheBucketMaxSize.toString(),
    searchModel: getEnvVar('SEARCH_MODEL'), // Not in config yet
    analysisModel: config.analysisModel,
  });
}

// Auto-initialize on import for Next.js
// This ensures the AI package is configured before any API routes use it
if (isServer()) {
  initializeAIPackage();
}