/**
 * Simple logging wrapper for AI package
 *
 * Respects AI_LOG_LEVEL env var (error/warn/info/debug)
 * Automatically includes job ID from context when available
 */

import { getCurrentJobId } from '../shared/jobContext';

type LogLevel = 'error' | 'warn' | 'info' | 'debug';

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
  const jobId = getCurrentJobId();
  const jobPart = jobId ? `[Job ${jobId}] ` : '';
  return `[${getTimestamp()}] ${jobPart}[AI${level ? ' ' + level : ''}]`;
}

interface LogContext {
  [key: string]: unknown;
}

class Logger {
  private isTest = process.env.NODE_ENV === 'test' || process.env.VITEST_WORKER_ID !== undefined;

  debug(message: string, context?: LogContext) {
    if (this.isTest || !shouldLog('debug')) return;
    console.debug(`${getPrefix('DEBUG')} ${message}`, context || '');
  }

  info(message: string, context?: LogContext) {
    if (this.isTest || !shouldLog('info')) return;
    console.log(`${getPrefix('')} ${message}`, context || '');
  }

  warn(message: string, context?: LogContext) {
    if (this.isTest || !shouldLog('warn')) return;
    console.warn(`${getPrefix('WARN')} ${message}`, context || '');
  }

  error(message: string, context?: LogContext) {
    if (this.isTest || !shouldLog('error')) return;
    console.error(`${getPrefix('ERROR')} ${message}`, context || '');
  }
}

export const logger = new Logger();
