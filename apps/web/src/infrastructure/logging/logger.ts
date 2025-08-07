/**
 * Simple logging wrapper for consistent logging across the application
 * In production, this can be replaced with a proper logging service
 */

import { config, isDevelopment, isTest } from '@roast/domain';

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
  userId?: string;
  requestId?: string;
  [key: string]: any;
}

class Logger {
  private isDevelopment = isDevelopment();
  private isTest = isTest();

  private log(level: LogLevel, message: string, context?: LogContext) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...context,
    };

    // In production, send to monitoring service
    if (!this.isDevelopment) {
      // TODO: Send to monitoring service (e.g., Sentry, DataDog, CloudWatch)
      // For now, we'll just structure the logs properly
      if (level === "error") {
        console.error(JSON.stringify(logEntry));
      }
      return;
    }

    // In development, use console with color coding
    switch (level) {
      case "debug":
        console.debug(`🔍 [${timestamp}] ${message}`, context || "");
        break;
      case "info":
        console.info(`ℹ️ [${timestamp}] ${message}`, context || "");
        break;
      case "warn":
        console.warn(`⚠️ [${timestamp}] ${message}`, context || "");
        break;
      case "error":
        console.error(`❌ [${timestamp}] ${message}`, context || "");
        break;
    }
  }

  debug(message: string, context?: LogContext) {
    // Allow debug logs in tests when explicitly enabled
    const allowTestDebug = config.features.testDebug;
    if (this.isDevelopment && (!this.isTest || allowTestDebug)) {
      this.log("debug", message, context);
    }
  }

  info(message: string, context?: LogContext) {
    this.log("info", message, context);
  }

  warn(message: string, context?: LogContext) {
    this.log("warn", message, context);
  }

  error(message: string, error?: Error | unknown, context?: LogContext) {
    const errorContext: LogContext = { ...context };
    
    if (error instanceof Error) {
      errorContext.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    } else if (error) {
      errorContext.error = error;
    }

    this.log("error", message, errorContext);
  }

  /**
   * Log API request details
   */
  logRequest(method: string, path: string, context?: LogContext) {
    this.info(`${method} ${path}`, context);
  }

  /**
   * Log API response details
   */
  logResponse(method: string, path: string, status: number, duration: number, context?: LogContext) {
    const message = `${method} ${path} - ${status} (${duration}ms)`;
    
    if (status >= 500) {
      this.error(message, undefined, context);
    } else if (status >= 400) {
      this.warn(message, context);
    } else {
      this.info(message, context);
    }
  }

  /**
   * Create a child logger with additional context
   */
  child(context: LogContext): Logger {
    const childLogger = new Logger();
    const originalLog = childLogger.log.bind(childLogger);
    
    childLogger.log = (level: LogLevel, message: string, additionalContext?: LogContext) => {
      originalLog(level, message, { ...context, ...additionalContext });
    };
    
    return childLogger;
  }
}

// Export singleton instance
export const logger = new Logger();

// Export type for use in other files
export type { Logger, LogContext };