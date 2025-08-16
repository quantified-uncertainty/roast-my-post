/**
 * Shared logger for AI package
 * Simple console-based logger that can be extended later
 */

/**
 * Logger argument types - supports structured logging
 */
export type LoggerArgs = Array<unknown>;

export interface Logger {
  info: (message: string, ...args: LoggerArgs) => void;
  warn: (message: string, ...args: LoggerArgs) => void;
  error: (message: string, ...args: LoggerArgs) => void;
  debug: (message: string, ...args: LoggerArgs) => void;
}

export interface LogContext {
  pluginId?: string;
  documentId?: string;
  userId?: string;
  sessionId?: string;
}

export const logger: Logger = {
  info: (message: string, ...args: LoggerArgs) => {
    console.log(`[AI-INFO] ${message}`, ...args);
  },
  warn: (message: string, ...args: LoggerArgs) => {
    console.warn(`[AI-WARN] ${message}`, ...args);
  },
  error: (message: string, ...args: LoggerArgs) => {
    console.error(`[AI-ERROR] ${message}`, ...args);
  },
  debug: (message: string, ...args: LoggerArgs) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[AI-DEBUG] ${message}`, ...args);
    }
  },
};