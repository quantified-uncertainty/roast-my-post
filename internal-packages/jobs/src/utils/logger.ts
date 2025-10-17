import { format } from 'date-fns';

/**
 * Simple logger for jobs package
 */

const getTimestamp = () => format(new Date(), 'yyyy-MM-dd HH:mm:ss.SSS');

export interface Logger {
  info(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  debug(message: string, ...args: any[]): void;
}

/**
 * Default console logger
 */
class ConsoleLogger implements Logger {
  info(message: string, ...args: any[]): void {
    console.log(`[${getTimestamp()}] [JOBS] ${message}`, ...args);
  }

  error(message: string, ...args: any[]): void {
    console.error(`[${getTimestamp()}] [JOBS ERROR] ${message}`, ...args);
  }

  warn(message: string, ...args: any[]): void {
    console.warn(`[${getTimestamp()}] [JOBS WARN] ${message}`, ...args);
  }

  debug(message: string, ...args: any[]): void {
    if (process.env.DEBUG) {
      console.debug(`[${getTimestamp()}] [JOBS DEBUG] ${message}`, ...args);
    }
  }
}

// Export a default logger instance
export const logger = new ConsoleLogger();
