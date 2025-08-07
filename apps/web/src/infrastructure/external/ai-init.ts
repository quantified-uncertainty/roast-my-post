/**
 * AI Package Initialization
 * 
 * This module initializes the @roast/ai package with configuration
 * from the centralized config system. This should be imported early in the
 * application lifecycle.
 */

import { initializeAI } from '@roast/ai';
import { isServer, getEnvVar } from '@roast/domain';

// Initialize the AI package with environment variables
export function initializeAIPackage() {
  initializeAI({
    anthropicApiKey: getEnvVar('ANTHROPIC_API_KEY'),
    openRouterApiKey: getEnvVar('OPENROUTER_API_KEY'),
    heliconeApiKey: getEnvVar('HELICONE_API_KEY'),
    heliconeEnabled: getEnvVar('HELICONE_ENABLED') === 'true',
    heliconeMaxAge: getEnvVar('HELICONE_CACHE_MAX_AGE', '3600'),
    heliconeMaxSize: getEnvVar('HELICONE_CACHE_BUCKET_MAX_SIZE', '10'),
    searchModel: getEnvVar('SEARCH_MODEL', 'claude-3-haiku-20240307'),
    analysisModel: getEnvVar('ANALYSIS_MODEL', 'claude-3-5-sonnet-20241022'),
  });
}

// Auto-initialize on import for Next.js
// This ensures the AI package is configured before any API routes use it
if (isServer()) {
  initializeAIPackage();
}