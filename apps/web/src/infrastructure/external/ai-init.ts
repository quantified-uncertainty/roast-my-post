/**
 * AI Package Initialization
 * 
 * This module initializes the @roast/ai package with configuration
 * from the centralized config system. This should be imported early in the
 * application lifecycle.
 */

import { initializeAI } from '@roast/ai';
import { config, isServer } from '@roast/domain';

// Initialize the AI package with centralized configuration
export function initializeAIPackage() {
  initializeAI({
    anthropicApiKey: config.ai.anthropicApiKey,
    openRouterApiKey: config.ai.openRouterApiKey,
    heliconeApiKey: config.ai.heliconeApiKey,
    heliconeEnabled: config.ai.heliconeEnabled,
    heliconeMaxAge: config.ai.heliconeMaxAge.toString(),
    heliconeMaxSize: config.ai.heliconeBucketMaxSize.toString(),
    searchModel: config.ai.searchModel,
    analysisModel: config.ai.analysisModel,
  });
}

// Auto-initialize on import for Next.js
// This ensures the AI package is configured before any API routes use it
if (isServer()) {
  initializeAIPackage();
}