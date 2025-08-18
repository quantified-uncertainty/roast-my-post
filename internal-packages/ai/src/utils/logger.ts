/**
 * Simple logging wrapper for AI package
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
  [key: string]: any;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV !== "production";
  private isTest = process.env.NODE_ENV === "test" || process.env.VITEST_WORKER_ID !== undefined;

  private log(level: LogLevel, message: string, context?: LogContext) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...context,
    };

    // In test environment, suppress most logs
    if (this.isTest && level !== "error") {
      return;
    }

    // Console logging
    switch (level) {
      case "debug":
        if (this.isDevelopment) console.debug(message, context || "");
        break;
      case "info":
        console.log(message, context || "");
        break;
      case "warn":
        console.warn(message, context || "");
        break;
      case "error":
        console.error(message, context || "");
        break;
    }
  }

  debug(message: string, context?: LogContext) {
    this.log("debug", message, context);
  }

  info(message: string, context?: LogContext) {
    this.log("info", message, context);
  }

  warn(message: string, context?: LogContext) {
    this.log("warn", message, context);
  }

  error(message: string, context?: LogContext) {
    this.log("error", message, context);
  }
}

export const logger = new Logger();