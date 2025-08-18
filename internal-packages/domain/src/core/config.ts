/**
 * Centralized Configuration System
 * 
 * Provides type-safe, validated configuration for the entire application.
 * All environment variables should be accessed through this configuration object.
 */

import { getEnvVar, requireEnvVar, isDevelopment, isProduction, isTest } from './environment';

/**
 * Application Configuration Interface
 * Defines the complete configuration structure with proper types
 */
export interface AppConfig {
  readonly env: {
    readonly nodeEnv: 'development' | 'production' | 'test';
    readonly isDevelopment: boolean;
    readonly isProduction: boolean;
    readonly isTest: boolean;
  };
  
  readonly database: {
    readonly url: string;
  };
  
  readonly ai: {
    readonly anthropicApiKey?: string;
    readonly openaiApiKey?: string;
    readonly openRouterApiKey?: string;
    readonly heliconeApiKey?: string;
    readonly heliconeEnabled: boolean;
    readonly heliconeMaxAge: number;
    readonly heliconeBucketMaxSize: number;
    readonly searchModel: string;
    readonly analysisModel: string;
  };
  
  readonly auth: {
    readonly secret: string;
    readonly nextAuthUrl?: string;
    readonly resendKey?: string;
    readonly emailFrom?: string;
  };
  
  readonly server: {
    readonly port: number;
    readonly host: string;
  };
  
  readonly features: {
    readonly debugLogging: boolean;
    readonly dockerBuild: boolean;
    readonly testDebug: boolean;
  };
  
  readonly jobs: {
    readonly adaptiveWorkers: {
      readonly maxWorkers: number;
      readonly pollIntervalMs: number;
      readonly workerTimeoutMs: number;
      readonly killGracePeriodMs: number;
      readonly shutdownTimeoutMs: number;
      readonly staleJobCheckIntervalMs: number;
      readonly staleJobTimeoutMs: number;
    };
  };
}

/**
 * Configuration Validation Utilities
 */
class ConfigValidator {
  static validateEnum<T extends string>(
    value: string | undefined,
    validValues: readonly T[],
    defaultValue?: T
  ): T {
    if (!value && defaultValue) return defaultValue;
    if (!value) throw new Error(`Value is required and must be one of: ${validValues.join(', ')}`);
    if (!validValues.includes(value as T)) {
      throw new Error(`Invalid value: ${value}. Must be one of: ${validValues.join(', ')}`);
    }
    return value as T;
  }

  static validatePort(value: string | undefined, defaultValue: number): number {
    if (!value) return defaultValue;
    const port = parseInt(value, 10);
    if (isNaN(port) || port < 1 || port > 65535) {
      throw new Error(`Invalid port: ${value}. Must be a number between 1 and 65535`);
    }
    return port;
  }

  static validatePositiveInteger(
    value: string | undefined, 
    defaultValue: number,
    name: string
  ): number {
    if (!value) return defaultValue;
    const num = parseInt(value, 10);
    if (isNaN(num) || num < 0) {
      throw new Error(`Invalid ${name}: ${value}. Must be a positive integer`);
    }
    return num;
  }

  static validateBoolean(value: string | undefined, defaultValue: boolean): boolean {
    if (!value) return defaultValue;
    return value.toLowerCase() === 'true' || value === '1';
  }
}

/**
 * Configuration Factory
 * Creates and validates the complete application configuration
 */
class ConfigFactory {
  static create(): AppConfig {
    try {
      // Validate NODE_ENV early
      const nodeEnv = ConfigValidator.validateEnum(
        getEnvVar('NODE_ENV'),
        ['development', 'production', 'test'] as const,
        'development'
      );

      return {
        env: {
          nodeEnv,
          isDevelopment: isDevelopment(),
          isProduction: isProduction(),
          isTest: isTest(),
        },

        database: {
          url: isTest() ? 'postgresql://test:test@localhost:5432/test' : requireEnvVar('DATABASE_URL'),
        },

        ai: {
          anthropicApiKey: getEnvVar('ANTHROPIC_API_KEY'),
          openaiApiKey: getEnvVar('OPENAI_API_KEY'),
          openRouterApiKey: getEnvVar('OPENROUTER_API_KEY'),
          heliconeApiKey: getEnvVar('HELICONE_API_KEY'),
          heliconeEnabled: ConfigValidator.validateBoolean(
            getEnvVar('HELICONE_ENABLED'), 
            false
          ),
          heliconeMaxAge: ConfigValidator.validatePositiveInteger(
            getEnvVar('HELICONE_CACHE_MAX_AGE'),
            3600,
            'HELICONE_CACHE_MAX_AGE'
          ),
          heliconeBucketMaxSize: ConfigValidator.validatePositiveInteger(
            getEnvVar('HELICONE_CACHE_BUCKET_MAX_SIZE'),
            10,
            'HELICONE_CACHE_BUCKET_MAX_SIZE'
          ),
          searchModel: getEnvVar('SEARCH_MODEL', 'claude-3-haiku-20240307'),
          analysisModel: getEnvVar('ANALYSIS_MODEL', 'claude-3-5-sonnet-20241022'),
        },

        auth: {
          secret: isTest() ? 'test-auth-secret' : requireEnvVar('AUTH_SECRET'),
          nextAuthUrl: getEnvVar('NEXTAUTH_URL'),
          resendKey: getEnvVar('AUTH_RESEND_KEY'),
          emailFrom: getEnvVar('EMAIL_FROM'),
        },

        server: {
          port: ConfigValidator.validatePort(getEnvVar('PORT'), 3000),
          host: getEnvVar('HOST', 'localhost'),
        },

        features: {
          debugLogging: ConfigValidator.validateBoolean(
            getEnvVar('DEBUG_LOGGING'),
            !isProduction()
          ),
          dockerBuild: ConfigValidator.validateBoolean(
            getEnvVar('DOCKER_BUILD'),
            false
          ),
          testDebug: ConfigValidator.validateBoolean(
            getEnvVar('VITEST_DEBUG') || getEnvVar('TEST_DEBUG'),
            false
          ),
        },

        jobs: {
          adaptiveWorkers: {
            maxWorkers: ConfigValidator.validatePositiveInteger(
              getEnvVar('ADAPTIVE_MAX_WORKERS'),
              5,
              'ADAPTIVE_MAX_WORKERS'
            ),
            pollIntervalMs: ConfigValidator.validatePositiveInteger(
              getEnvVar('ADAPTIVE_POLL_INTERVAL_MS'),
              1000,
              'ADAPTIVE_POLL_INTERVAL_MS'
            ),
            workerTimeoutMs: ConfigValidator.validatePositiveInteger(
              getEnvVar('ADAPTIVE_WORKER_TIMEOUT_MS'),
              240000,
              'ADAPTIVE_WORKER_TIMEOUT_MS'
            ),
            killGracePeriodMs: ConfigValidator.validatePositiveInteger(
              getEnvVar('ADAPTIVE_KILL_GRACE_PERIOD_MS'),
              5000,
              'ADAPTIVE_KILL_GRACE_PERIOD_MS'
            ),
            shutdownTimeoutMs: ConfigValidator.validatePositiveInteger(
              getEnvVar('ADAPTIVE_SHUTDOWN_TIMEOUT_MS'),
              30000,
              'ADAPTIVE_SHUTDOWN_TIMEOUT_MS'
            ),
            staleJobCheckIntervalMs: ConfigValidator.validatePositiveInteger(
              getEnvVar('ADAPTIVE_STALE_CHECK_INTERVAL_MS'),
              300000,
              'ADAPTIVE_STALE_CHECK_INTERVAL_MS'
            ),
            staleJobTimeoutMs: ConfigValidator.validatePositiveInteger(
              getEnvVar('ADAPTIVE_STALE_JOB_TIMEOUT_MS'),
              1800000,
              'ADAPTIVE_STALE_JOB_TIMEOUT_MS'
            ),
          },
        },
      };
    } catch (error) {
      console.error('❌ Configuration validation failed:', error);
      throw new Error(`Configuration Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Validate configuration at startup
   * Throws descriptive errors for missing or invalid configuration
   */
  static validate(config: AppConfig): void {
    const errors: string[] = [];

    // Database validation
    if (!config.database.url) {
      errors.push('DATABASE_URL is required');
    }

    // Auth validation
    if (!config.auth.secret) {
      errors.push('AUTH_SECRET is required');
    }

    // AI validation (warn if no API keys configured)
    if (!config.ai.anthropicApiKey && !config.ai.openaiApiKey && !config.ai.openRouterApiKey) {
      console.warn('⚠️  No AI API keys configured. AI features will not work.');
    }

    // Email validation (if one is set, both should be set)
    if (config.auth.resendKey && !config.auth.emailFrom) {
      errors.push('EMAIL_FROM is required when AUTH_RESEND_KEY is set');
    }
    if (config.auth.emailFrom && !config.auth.resendKey) {
      errors.push('AUTH_RESEND_KEY is required when EMAIL_FROM is set');
    }

    if (errors.length > 0) {
      throw new Error(`Configuration validation failed:\n${errors.map(e => `  - ${e}`).join('\n')}`);
    }
  }
}

/**
 * Application Configuration Singleton - Lazy Loaded
 * Use this throughout the application instead of direct process.env access
 */
let _config: AppConfig | undefined;

export const config: AppConfig = new Proxy({} as AppConfig, {
  get(target, prop) {
    if (!_config) {
      _config = ConfigFactory.create();
      ConfigFactory.validate(_config);
    }
    return _config[prop as keyof AppConfig];
  }
});

/**
 * Get configuration (creates if needed)
 * Safer than accessing config object directly in middleware/early code
 */
export const getConfig = (): AppConfig => {
  if (!_config) {
    _config = ConfigFactory.create();
    ConfigFactory.validate(_config);
  }
  return _config;
};

/**
 * Development helper to log configuration (without secrets)
 */
export const logConfiguration = (): void => {
  if (!config.env.isDevelopment && !config.features.debugLogging) return;
  
  const safeConfig = {
    ...config,
    database: {
      url: config.database.url ? '[REDACTED]' : undefined,
    },
    auth: {
      secret: '[REDACTED]',
      nextAuthUrl: config.auth.nextAuthUrl,
      resendKey: config.auth.resendKey ? '[REDACTED]' : undefined,
      emailFrom: config.auth.emailFrom,
    },
    ai: {
      ...config.ai,
      anthropicApiKey: config.ai.anthropicApiKey ? '[REDACTED]' : undefined,
      openaiApiKey: config.ai.openaiApiKey ? '[REDACTED]' : undefined,
      openRouterApiKey: config.ai.openRouterApiKey ? '[REDACTED]' : undefined,
      heliconeApiKey: config.ai.heliconeApiKey ? '[REDACTED]' : undefined,
    },
  };
  
  console.log('🔧 Application Configuration:', JSON.stringify(safeConfig, null, 2));
};