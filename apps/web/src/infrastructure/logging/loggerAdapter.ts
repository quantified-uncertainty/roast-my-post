/**
 * Logger Adapter
 * 
 * Adapts the web app's logger implementation to match
 * the Logger interface expected by the domain services.
 */

import { logger as webLogger } from './logger';
import type { Logger } from '@roast/domain';

/**
 * Creates a logger adapter that implements the domain Logger interface
 */
export function createLoggerAdapter(): Logger {
  return {
    info: (message: string, meta?: any) => {
      if (meta) {
        webLogger.info(message, meta);
      } else {
        webLogger.info(message);
      }
    },
    
    warn: (message: string, meta?: any) => {
      if (meta) {
        webLogger.warn(message, meta);
      } else {
        webLogger.warn(message);
      }
    },
    
    error: (message: string, meta?: any) => {
      if (meta) {
        webLogger.error(message, meta);
      } else {
        webLogger.error(message);
      }
    },
    
    debug: (message: string, meta?: any) => {
      if (meta) {
        webLogger.debug(message, meta);
      } else {
        webLogger.debug(message);
      }
    }
  };
}