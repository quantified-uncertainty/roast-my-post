/**
 * Core environment utilities for consistent browser/server detection
 * Single source of truth for environment checks
 */

// Cache the check results for performance
const _isBrowser = typeof window !== 'undefined';
const _isServer = !_isBrowser;
const _isDevelopment = process.env.NODE_ENV === 'development';
const _isProduction = process.env.NODE_ENV === 'production';
const _isTest = process.env.NODE_ENV === 'test';

/**
 * Check if code is running in browser environment
 */
export const isBrowser = (): boolean => _isBrowser;

/**
 * Check if code is running in server environment
 */
export const isServer = (): boolean => _isServer;

/**
 * Check if running in development mode
 */
export const isDevelopment = (): boolean => _isDevelopment;

/**
 * Check if running in production mode
 */
export const isProduction = (): boolean => _isProduction;

/**
 * Check if running in test environment
 */
export const isTest = (): boolean => _isTest;

/**
 * Ensure code is running on server, throw if in browser
 * Use this to guard server-only code
 */
export const requireServer = (operation: string = 'This operation'): void => {
  if (isBrowser()) {
    throw new Error(`${operation} can only be performed on the server`);
  }
};

/**
 * Ensure code is running in browser, throw if on server
 * Use this to guard browser-only code
 */
export const requireBrowser = (operation: string = 'This operation'): void => {
  if (isServer()) {
    throw new Error(`${operation} can only be performed in the browser`);
  }
};

/**
 * Get environment variable with fallback
 * Returns undefined in browser environment
 */
export const getEnvVar = (key: string, fallback?: string): string | undefined => {
  if (isBrowser()) return fallback;
  return process.env[key] || fallback;
};

/**
 * Get required environment variable
 * Throws if not found (server) or returns fallback (browser)
 */
export const requireEnvVar = (key: string, fallback?: string): string => {
  if (isBrowser()) {
    if (!fallback) {
      throw new Error(`Environment variable ${key} is not available in browser`);
    }
    return fallback;
  }
  
  const value = process.env[key];
  if (!value) {
    throw new Error(`Required environment variable ${key} is not set`);
  }
  return value;
};