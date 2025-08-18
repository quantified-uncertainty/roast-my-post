/**
 * Configuration Validation Tests
 * Ensures configuration loads correctly in various environments
 */

import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';

describe('Configuration Validation', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    // Restore original environment
    Object.keys(process.env).forEach(key => {
      delete process.env[key];
    });
    Object.assign(process.env, originalEnv);
    
    // Clear the config cache by requiring fresh module
    vi.resetModules();
  });

  // Helper to set environment variables in a type-safe way
  const setEnvVars = (vars: Record<string, string | undefined>) => {
    Object.entries(vars).forEach(([key, value]) => {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    });
  };

  it('should load config without errors in test environment', () => {
    // Set minimal required environment variables
    setEnvVars({
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
      AUTH_SECRET: 'test-secret'
    });

    expect(() => {
      const { config } = require('@roast/domain');
      return config.env.nodeEnv;
    }).not.toThrow();
  });

  it('should handle missing DATABASE_URL gracefully in test mode', () => {
    setEnvVars({
      NODE_ENV: 'test',
      DATABASE_URL: undefined, // Explicitly delete
      AUTH_SECRET: 'test-secret'
    });

    expect(() => {
      const { config } = require('@roast/domain');
      expect(config.database.url).toBe('postgresql://test:test@localhost:5432/test');
    }).not.toThrow();
  });

  it('should require DATABASE_URL in production mode', () => {
    setEnvVars({
      NODE_ENV: 'production',
      DATABASE_URL: undefined, // Explicitly delete
      AUTH_SECRET: 'production-secret'
    });

    expect(() => {
      const { config } = require('@roast/domain');
      return config.database.url;
    }).toThrow('Required environment variable DATABASE_URL is not set');
  });

  it('should validate environment-specific defaults', () => {
    setEnvVars({
      NODE_ENV: 'development',
      DATABASE_URL: 'postgresql://dev:dev@localhost:5432/dev',
      AUTH_SECRET: 'dev-secret'
    });

    const { config } = require('@roast/domain');
    
    expect(config.env.nodeEnv).toBe('development');
    expect(config.env.isDevelopment).toBe(true);
    expect(config.env.isProduction).toBe(false);
    expect(config.env.isTest).toBe(false);
    expect(config.features.debugLogging).toBe(true); // Default for development
  });

  it('should handle lazy loading correctly', () => {
    setEnvVars({
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
      AUTH_SECRET: 'test-secret'
    });

    // First access should create config
    const { config } = require('@roast/domain');
    const firstAccess = config.env.nodeEnv;
    
    // Second access should use cached version
    const secondAccess = config.env.nodeEnv;
    
    expect(firstAccess).toBe(secondAccess);
    expect(firstAccess).toBe('test');
  });

  it('should validate configuration schema', () => {
    setEnvVars({
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
      AUTH_SECRET: 'test-secret',
      PORT: '3000',
      ANTHROPIC_API_KEY: 'sk-test'
    });

    const { config } = require('@roast/domain');

    // Check required fields exist
    expect(config.env).toBeDefined();
    expect(config.database).toBeDefined();
    expect(config.ai).toBeDefined();
    expect(config.auth).toBeDefined();
    expect(config.server).toBeDefined();
    expect(config.features).toBeDefined();
    expect(config.jobs).toBeDefined();

    // Check types are correct
    expect(typeof config.env.nodeEnv).toBe('string');
    expect(typeof config.env.isDevelopment).toBe('boolean');
    expect(typeof config.server.port).toBe('number');
    expect(typeof config.features.debugLogging).toBe('boolean');
  });
});