/**
 * Simple logger for jobs package
 */

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
    console.log(`[JOBS] ${message}`, ...args);
  }

  error(message: string, ...args: any[]): void {
    console.error(`[JOBS ERROR] ${message}`, ...args);
  }

  warn(message: string, ...args: any[]): void {
    console.warn(`[JOBS WARN] ${message}`, ...args);
  }

  debug(message: string, ...args: any[]): void {
    if (process.env.DEBUG) {
      console.debug(`[JOBS DEBUG] ${message}`, ...args);
    }
  }
}

// Export a default logger instance
export const logger = new ConsoleLogger();