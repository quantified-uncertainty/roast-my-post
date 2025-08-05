/**
 * Build-time environment validation
 * Fails fast if required environment variables are missing
 */

const REQUIRED_ENV_VARS = [
  'DATABASE_URL',
  'AUTH_SECRET',
  'ANTHROPIC_API_KEY',
] as const;

const OPTIONAL_ENV_VARS = [
  'NEXTAUTH_URL',
  'AUTH_RESEND_KEY', 
  'EMAIL_FROM',
  'HELICONE_API_KEY',
  'FIRECRAWL_KEY',
  'OPENAI_API_KEY',
  'OPENROUTER_API_KEY',
] as const;

export function validateBuildEnvironment() {
  const missing: string[] = [];
  const warnings: string[] = [];

  // Docker builds use dummy values during build time
  // Real values are injected at runtime in Kubernetes
  if (process.env.DOCKER_BUILD === 'true' || process.env.DOCKER_BUILD === '1') {
    console.log('📦 Skipping environment validation for Docker build');
    return;
  }

  // Check required variables
  for (const envVar of REQUIRED_ENV_VARS) {
    if (!process.env[envVar]) {
      missing.push(envVar);
    }
  }

  // Check optional variables
  for (const envVar of OPTIONAL_ENV_VARS) {
    if (!process.env[envVar]) {
      warnings.push(envVar);
    }
  }

  // Fail fast if any required variables are missing
  if (missing.length > 0) {
    console.error('❌ Build failed: Missing required environment variables:');
    for (const envVar of missing) {
      console.error(`   - ${envVar}`);
    }
    console.error('\nPlease set these environment variables before building.');
    console.error('For local development, add them to .env.local');
    console.error('For Vercel deployment, add them in the Vercel dashboard.');
    process.exit(1);
  }

  // Log warnings for optional variables
  if (warnings.length > 0) {
    console.warn('⚠️  Optional environment variables not set:');
    for (const envVar of warnings) {
      console.warn(`   - ${envVar}`);
    }
    console.warn('Some features may not work without these variables.\n');
  }

  console.log('✅ Environment validation passed');
}

// Run validation immediately when this module is imported
// Skip validation during Docker builds since env vars are injected at runtime
if (process.env.NODE_ENV !== 'test' && process.env.DOCKER_BUILD !== 'true' && process.env.DOCKER_BUILD !== '1') {
  validateBuildEnvironment();
}