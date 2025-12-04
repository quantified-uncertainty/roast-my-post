/**
 * Shared logger for AI package
 * Simple console-based logger with configurable log level
 *
 * Set AI_LOG_LEVEL env var to control verbosity:
 * - error: Only errors
 * - warn: Errors and warnings
 * - info: Errors, warnings, and info (default)
 * - debug: All logs including debug
 *
 * Automatically includes worker ID and job ID from context when available.
 * Format: [timestamp] [Worker xxx] [Job yyy] [AI LEVEL] message
 */

import { getCurrentJobId, getWorkerId } from './jobContext';

export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

const LOG_LEVELS: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

function getLogLevel(): LogLevel {
  const level = process.env.AI_LOG_LEVEL?.toLowerCase();
  if (level && level in LOG_LEVELS) {
    return level as LogLevel;
  }
  return 'info';
}

function shouldLog(level: LogLevel): boolean {
  const currentLevel = getLogLevel();
  return LOG_LEVELS[level] <= LOG_LEVELS[currentLevel];
}

function getTimestamp(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const ms = String(now.getMilliseconds()).padStart(3, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${ms}`;
}

function getPrefix(level: string): string {
  const workerId = getWorkerId();
  const jobId = getCurrentJobId();
  const workerPart = workerId ? `[Worker ${workerId}] ` : '';
  const jobPart = jobId ? `[Job ${jobId}] ` : '';
  const levelStr = level || 'INFO';
  return `[${getTimestamp()}] [${levelStr}] [AI] ${workerPart}${jobPart}`;
}

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
    if (shouldLog('info')) {
      console.log(`${getPrefix('INFO')} ${message}`, ...args);
    }
  },
  warn: (message: string, ...args: LoggerArgs) => {
    if (shouldLog('warn')) {
      console.warn(`${getPrefix('WARN')} ${message}`, ...args);
    }
  },
  error: (message: string, ...args: LoggerArgs) => {
    if (shouldLog('error')) {
      console.error(`${getPrefix('ERROR')} ${message}`, ...args);
    }
  },
  debug: (message: string, ...args: LoggerArgs) => {
    if (shouldLog('debug')) {
      console.debug(`${getPrefix('DEBUG')} ${message}`, ...args);
    }
  },
};
