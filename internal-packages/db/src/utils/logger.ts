/**
 * Simple logger for db package
 * Uses console with structured output for easy parsing
 */

export interface LogContext {
  [key: string]: unknown;
}

function formatLog(level: string, message: string, context?: LogContext): string {
  const timestamp = new Date().toISOString();
  const baseLog = `[${timestamp}] [${level}] ${message}`;

  if (context && Object.keys(context).length > 0) {
    return `${baseLog} ${JSON.stringify(context)}`;
  }

  return baseLog;
}

export const logger = {
  info(message: string, context?: LogContext): void {
    console.log(formatLog('INFO', message, context));
  },

  warn(message: string, context?: LogContext): void {
    console.warn(formatLog('WARN', message, context));
  },

  error(message: string, context?: LogContext): void {
    console.error(formatLog('ERROR', message, context));
  },

  debug(message: string, context?: LogContext): void {
    if (process.env.NODE_ENV === 'development') {
      console.debug(formatLog('DEBUG', message, context));
    }
  }
};
