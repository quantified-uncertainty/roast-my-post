/**
 * Core environment utilities for consistent environment detection
 * Single source of truth for environment checks
 */

// Cache the check results for performance
const _isDevelopment = process.env.NODE_ENV === 'development';
const _isProduction = process.env.NODE_ENV === 'production';
const _isTest = process.env.NODE_ENV === 'test';

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
 * Get environment variable with fallback
 */
export const getEnvVar = (key: string, fallback?: string): string | undefined => {
  return process.env[key] || fallback;
};

/**
 * Get required environment variable
 * Throws if not found
 */
export const requireEnvVar = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Required environment variable ${key} is not set`);
  }
  return value;
};

/**
 * Check if running on server side (Node.js)
 */
export const isServer = (): boolean => {
  return typeof window === 'undefined';
};