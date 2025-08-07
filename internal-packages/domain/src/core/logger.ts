/**
 * Logger interface for domain services
 * Allows dependency injection of different logger implementations
 */

export interface Logger {
  info(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
  error(message: string, meta?: any): void;
  debug(message: string, meta?: any): void;
}

/**
 * Console logger implementation for testing/development
 */
export class ConsoleLogger implements Logger {
  info(message: string, meta?: any): void {
    console.info(`[INFO] ${message}`, meta || '');
  }
  
  warn(message: string, meta?: any): void {
    console.warn(`[WARN] ${message}`, meta || '');
  }
  
  error(message: string, meta?: any): void {
    console.error(`[ERROR] ${message}`, meta || '');
  }
  
  debug(message: string, meta?: any): void {
    console.debug(`[DEBUG] ${message}`, meta || '');
  }
}

/**
 * No-op logger for production scenarios where logging is handled externally
 */
export class NoOpLogger implements Logger {
  info(): void {}
  warn(): void {}
  error(): void {}
  debug(): void {}
}