/**
 * Shared logger for AI package
 * Simple console-based logger that can be extended later
 */

export interface Logger {
  info: (message: string, ...args: any[]) => void;
  warn: (message: string, ...args: any[]) => void;
  error: (message: string, ...args: any[]) => void;
  debug: (message: string, ...args: any[]) => void;
}

export const logger: Logger = {
  info: (message: string, ...args: any[]) => {
    console.log(`[AI-INFO] ${message}`, ...args);
  },
  warn: (message: string, ...args: any[]) => {
    console.warn(`[AI-WARN] ${message}`, ...args);
  },
  error: (message: string, ...args: any[]) => {
    console.error(`[AI-ERROR] ${message}`, ...args);
  },
  debug: (message: string, ...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[AI-DEBUG] ${message}`, ...args);
    }
  },
};