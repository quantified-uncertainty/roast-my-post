/**
 * AI Package Initialization
 * 
 * This module initializes the @roast/ai package with configuration
 * from environment variables. This should be imported early in the
 * application lifecycle.
 */

import { initializeAI } from '@roast/ai';

// Initialize the AI package with environment configuration
export function initializeAIPackage() {
  initializeAI({
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    openRouterApiKey: process.env.OPENROUTER_API_KEY,
    heliconeApiKey: process.env.HELICONE_API_KEY,
    heliconeEnabled: process.env.HELICONE_CACHE_ENABLED === 'true',
    heliconeMaxAge: process.env.HELICONE_CACHE_MAX_AGE,
    heliconeMaxSize: process.env.HELICONE_CACHE_BUCKET_MAX_SIZE,
    searchModel: process.env.SEARCH_MODEL,
    analysisModel: process.env.ANALYSIS_MODEL,
  });
}

// Auto-initialize on import for Next.js
// This ensures the AI package is configured before any API routes use it
if (typeof window === 'undefined') {
  initializeAIPackage();
}