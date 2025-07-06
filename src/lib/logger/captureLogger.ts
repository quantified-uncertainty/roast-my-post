import { logger } from "@/lib/logger";

export interface LogEntry {
  level: string;
  message: string;
  timestamp: Date;
  data?: any;
}

export class CaptureLogger {
  private logs: LogEntry[] = [];
  private originalLogger: typeof logger;

  constructor() {
    this.originalLogger = logger;
  }

  // Capture log methods
  info(message: string, data?: any) {
    this.logs.push({ level: "info", message, timestamp: new Date(), data });
    this.originalLogger.info(message, data);
  }

  error(message: string, data?: any) {
    this.logs.push({ level: "error", message, timestamp: new Date(), data });
    this.originalLogger.error(message, data);
  }

  warn(message: string, data?: any) {
    this.logs.push({ level: "warn", message, timestamp: new Date(), data });
    this.originalLogger.warn(message, data);
  }

  debug(message: string, data?: any) {
    this.logs.push({ level: "debug", message, timestamp: new Date(), data });
    this.originalLogger.debug(message, data);
  }

  // Get captured logs as formatted string
  getLogsAsString(): string {
    return this.logs.map(log => {
      const timestamp = log.timestamp.toISOString().split('T')[1].replace('Z', '');
      let line = `[${timestamp}] ${log.level.toUpperCase()}: ${log.message}`;
      if (log.data) {
        line += `\n  ${JSON.stringify(log.data, null, 2).replace(/\n/g, '\n  ')}`;
      }
      return line;
    }).join('\n\n');
  }

  // Get logs as array
  getLogs(): LogEntry[] {
    return this.logs;
  }

  // Clear logs
  clear() {
    this.logs = [];
  }
}