/**
 * Build-time environment validation
 * Fails fast if required environment variables are missing
 * 
 * Note: This validation is now redundant with the centralized config validation.
 * This file is kept for compatibility but will delegate to config validation.
 */

import { config } from '@roast/domain';

export function validateBuildEnvironment() {
  // Docker builds use dummy values during build time
  // Real values are injected at runtime in Kubernetes
  if (config.features.dockerBuild) {
    console.log('📦 Skipping environment validation for Docker build');
    return;
  }

  // Configuration validation is now handled by @roast/domain config system
  // The config module will throw if required variables are missing
  try {
    // Just accessing config will trigger validation
    const { env } = config;
    console.log(`✅ Environment validation passed (${env.nodeEnv} mode)`);
  } catch (error) {
    console.error('❌ Build failed: Configuration validation error:');
    console.error(error instanceof Error ? error.message : String(error));
    console.error('\nPlease set required environment variables before building.');
    console.error('For local development, add them to .env.local');
    console.error('For Vercel deployment, add them in the Vercel dashboard.');
    process.exit(1);
  }
}

// Run validation immediately when this module is imported
// Skip validation during Docker builds since env vars are injected at runtime
if (!config.env.isTest && !config.features.dockerBuild) {
  validateBuildEnvironment();
}