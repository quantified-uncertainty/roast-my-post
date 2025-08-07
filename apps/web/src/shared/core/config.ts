/**
 * Centralized configuration management
 * Single source of truth for all app configuration
 */

import { requireServer, getEnvVar, requireEnvVar, isProduction, isDevelopment, isServer } from './environment';

/**
 * Application configuration singleton
 * Access all environment variables through this class
 */
class AppConfig {
  private static instance: AppConfig;
  private _cache = new Map<string, any>();

  private constructor() {}

  static getInstance(): AppConfig {
    if (!AppConfig.instance) {
      AppConfig.instance = new AppConfig();
    }
    return AppConfig.instance;
  }

  // ============ Database Configuration ============
  get databaseUrl(): string {
    return this.getCached('databaseUrl', () => 
      requireEnvVar('DATABASE_URL')
    );
  }

  // ============ Authentication Configuration ============
  get nextAuthUrl(): string {
    return this.getCached('nextAuthUrl', () => 
      getEnvVar('NEXTAUTH_URL', 'http://localhost:3000') as string
    );
  }

  get authSecret(): string {
    return this.getCached('authSecret', () => 
      requireEnvVar('AUTH_SECRET')
    );
  }

  // ============ AI/LLM Configuration ============
  get anthropicApiKey(): string | undefined {
    requireServer('Accessing Anthropic API key');
    return this.getCached('anthropicApiKey', () => 
      getEnvVar('ANTHROPIC_API_KEY')
    );
  }

  get openaiApiKey(): string | undefined {
    requireServer('Accessing OpenAI API key');
    return this.getCached('openaiApiKey', () => 
      getEnvVar('OPENAI_API_KEY')
    );
  }

  get analysisModel(): string {
    return this.getCached('analysisModel', () => 
      getEnvVar('ANALYSIS_MODEL', 'claude-sonnet-4-20250514') as string
    );
  }

  // ============ Helicone Configuration ============
  get heliconeApiKey(): string | undefined {
    return this.getCached('heliconeApiKey', () => 
      getEnvVar('HELICONE_API_KEY')
    );
  }

  get heliconeEnabled(): boolean {
    return this.getCached('heliconeEnabled', () => 
      getEnvVar('HELICONE_CACHE_ENABLED') === 'true'
    );
  }

  get heliconeCacheMaxAge(): number {
    return this.getCached('heliconeCacheMaxAge', () => {
      const value = getEnvVar('HELICONE_CACHE_MAX_AGE');
      return value ? parseInt(value, 10) : 86400; // Default 24 hours
    });
  }

  get heliconeCacheBucketMaxSize(): number {
    return this.getCached('heliconeCacheBucketMaxSize', () => {
      const value = getEnvVar('HELICONE_CACHE_BUCKET_MAX_SIZE');
      return value ? parseInt(value, 10) : 10; // Default 10 items
    });
  }

  // ============ Feature Flags ============
  get debugMode(): boolean {
    return this.getCached('debugMode', () => 
      getEnvVar('DEBUG') === 'true' || isDevelopment()
    );
  }

  get enableJobProcessing(): boolean {
    return this.getCached('enableJobProcessing', () => 
      getEnvVar('ENABLE_JOB_PROCESSING', 'true') === 'true'
    );
  }

  // ============ External Services ============
  get firecrawlApiKey(): string | undefined {
    return this.getCached('firecrawlApiKey', () => 
      getEnvVar('FIRECRAWL_API_KEY')
    );
  }

  get resendApiKey(): string | undefined {
    return this.getCached('resendApiKey', () => 
      getEnvVar('RESEND_API_KEY')
    );
  }

  // ============ App Settings ============
  get appName(): string {
    return 'RoastMyPost';
  }

  get appUrl(): string {
    return this.getCached('appUrl', () => 
      getEnvVar('APP_URL', 'http://localhost:3000') as string
    );
  }

  get maxJobRetries(): number {
    return this.getCached('maxJobRetries', () => {
      const value = getEnvVar('MAX_JOB_RETRIES');
      return value ? parseInt(value, 10) : 3;
    });
  }

  get jobTimeoutMs(): number {
    return this.getCached('jobTimeoutMs', () => {
      const value = getEnvVar('JOB_TIMEOUT_MS');
      return value ? parseInt(value, 10) : 300000; // Default 5 minutes
    });
  }

  // ============ Helper Methods ============
  
  /**
   * Get a cached configuration value or compute it
   */
  private getCached<T>(key: string, compute: () => T): T {
    if (!this._cache.has(key)) {
      this._cache.set(key, compute());
    }
    return this._cache.get(key) as T;
  }

  /**
   * Clear the configuration cache (useful for testing)
   */
  clearCache(): void {
    this._cache.clear();
  }

  /**
   * Validate that all required configuration is present
   * Call this on app startup to fail fast
   */
  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check required server configuration
    if (isServer()) {
      if (!this.databaseUrl) errors.push('DATABASE_URL is required');
      if (!this.authSecret) errors.push('AUTH_SECRET is required');
      
      // Check AI configuration
      if (!this.anthropicApiKey && !this.openaiApiKey) {
        errors.push('At least one AI API key (ANTHROPIC_API_KEY or OPENAI_API_KEY) is required');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get all configuration as a plain object (for debugging)
   * Masks sensitive values
   */
  toJSON(): Record<string, any> {
    return {
      app: {
        name: this.appName,
        url: this.appUrl,
        debug: this.debugMode,
      },
      database: {
        url: this.maskSecret(this.databaseUrl),
      },
      auth: {
        url: this.nextAuthUrl,
        secret: this.maskSecret(this.authSecret),
      },
      ai: {
        anthropicKey: this.maskSecret(this.anthropicApiKey),
        openaiKey: this.maskSecret(this.openaiApiKey),
        model: this.analysisModel,
      },
      helicone: {
        enabled: this.heliconeEnabled,
        key: this.maskSecret(this.heliconeApiKey),
        cacheMaxAge: this.heliconeCacheMaxAge,
        cacheBucketMaxSize: this.heliconeCacheBucketMaxSize,
      },
      features: {
        jobProcessing: this.enableJobProcessing,
      },
      jobs: {
        maxRetries: this.maxJobRetries,
        timeoutMs: this.jobTimeoutMs,
      }
    };
  }

  private maskSecret(value: string | undefined): string {
    if (!value) return 'not set';
    if (value.length <= 8) return '***';
    return value.slice(0, 4) + '***' + value.slice(-4);
  }
}

// Export singleton instance
export const config = AppConfig.getInstance();

// Export for testing
export const _AppConfig = AppConfig;