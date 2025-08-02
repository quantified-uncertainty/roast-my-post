/**
 * Centralized logging system for plugin execution
 * 
 * This logger captures structured logs during plugin execution and integrates
 * with the Job system to persist logs for debugging and monitoring.
 */

import { logger, type LogContext } from "../shared/logger";

export interface PluginLogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  plugin: string;
  phase: 'initialization' | 'chunking' | 'routing' | 'analysis' | 'location_finding' | 'comment_generation' | 'cleanup' | 'summary' | 'skipped';
  message: string;
  context?: {
    chunkIndex?: number;
    totalChunks?: number;
    itemsProcessed?: number;
    itemsFound?: number;
    commentsGenerated?: number;
    duration?: number;
    cost?: number;
    startOffset?: number;
    endOffset?: number;
    textLength?: number;
    tokensUsed?: { input: number; output: number };
    error?: {
      name: string;
      message: string;
      stack?: string;
      context?: any;
    };
    pluginName?: string;
    chunkCount?: number;
    chunkIds?: string[];
    data?: any;
  };
}

export interface PluginExecutionSummary {
  plugin: string;
  status: 'success' | 'failed' | 'partial';
  startTime: string;
  endTime: string;
  duration: number;
  itemsProcessed: number;
  itemsFound: number;
  commentsGenerated: number;
  cost: number;
  errors: number;
  warnings: number;
  retriesUsed: number;
  finalError?: string;
}

export interface JobLogSummary {
  jobId?: string;
  totalDuration: number;
  totalCost: number;
  totalChunks: number;
  totalComments: number;
  pluginSummaries: PluginExecutionSummary[];
  overallStatus: 'success' | 'failed' | 'partial';
  errors: number;
  warnings: number;
  keyIssues: Array<{
    plugin: string;
    issue: string;
    count: number;
    example?: string;
  }>;
}

export class PluginLogger {
  private entries: PluginLogEntry[] = [];
  private pluginStartTimes = new Map<string, number>();
  private pluginStats = new Map<string, {
    itemsProcessed: number;
    itemsFound: number;
    commentsGenerated: number;
    cost: number;
    errors: number;
    warnings: number;
    retriesUsed: number;
    finalError?: string;
  }>();
  
  private jobId?: string;
  private sessionStartTime: number;

  constructor(jobId?: string) {
    this.jobId = jobId;
    this.sessionStartTime = Date.now();
  }

  /**
   * Create a plugin-specific logger instance
   */
  createPluginLogger(pluginName: string): PluginLoggerInstance {
    return new PluginLoggerInstance(this, pluginName);
  }

  /**
   * Log a plugin event
   */
  log(entry: Omit<PluginLogEntry, 'timestamp'>): void {
    const fullEntry: PluginLogEntry = {
      timestamp: new Date().toISOString(),
      ...entry
    };

    this.entries.push(fullEntry);

    // Update plugin statistics
    this.updatePluginStats(entry.plugin, entry);

    // Also log to console for development
    const contextStr = entry.context ? JSON.stringify(entry.context, null, 2) : '';
    const phaseStr = entry.phase ? `[${entry.phase}] ` : '';
    
    switch (entry.level) {
      case 'debug':
        logger.debug(`${entry.plugin}: ${phaseStr}${entry.message}`, { context: entry.context });
        break;
      case 'info':
        logger.info(`${entry.plugin}: ${phaseStr}${entry.message}`, { context: entry.context });
        break;
      case 'warn':
        logger.warn(`${entry.plugin}: ${phaseStr}${entry.message}`, { context: entry.context });
        break;
      case 'error':
        logger.error(`${entry.plugin}: ${phaseStr}${entry.message}`, entry.context?.error, { context: entry.context });
        break;
    }
  }

  /**
   * Mark plugin as started
   */
  pluginStarted(pluginName: string): void {
    this.pluginStartTimes.set(pluginName, Date.now());
    this.pluginStats.set(pluginName, {
      itemsProcessed: 0,
      itemsFound: 0,
      commentsGenerated: 0,
      cost: 0,
      errors: 0,
      warnings: 0,
      retriesUsed: 0
    });

    this.log({
      level: 'info',
      plugin: pluginName,
      phase: 'initialization',
      message: 'Starting analysis'
    });
  }

  /**
   * Mark plugin as completed
   */
  pluginCompleted(pluginName: string, result: { 
    itemsFound?: number;
    commentsGenerated?: number;
    cost?: number;
    error?: string;
  } = {}): void {
    const stats = this.pluginStats.get(pluginName);
    if (stats) {
      stats.itemsFound = result.itemsFound || stats.itemsFound;
      stats.commentsGenerated = result.commentsGenerated || stats.commentsGenerated;
      stats.cost = result.cost || stats.cost;
      if (result.error) {
        stats.finalError = result.error;
      }
    }

    const startTime = this.pluginStartTimes.get(pluginName);
    const duration = startTime ? Date.now() - startTime : 0;

    this.log({
      level: result.error ? 'error' : 'info',
      plugin: pluginName,
      phase: 'summary',
      message: result.error ? `Analysis failed: ${result.error}` : `Analysis complete - ${result.commentsGenerated || 0} comments generated`,
      context: {
        duration,
        itemsFound: result.itemsFound,
        commentsGenerated: result.commentsGenerated,
        cost: result.cost,
        ...(result.error && { error: { name: 'PluginError', message: result.error } })
      }
    });
  }

  /**
   * Record a retry attempt
   */
  pluginRetried(pluginName: string, attempt: number, maxAttempts: number, error: string): void {
    const stats = this.pluginStats.get(pluginName);
    if (stats) {
      stats.retriesUsed = Math.max(stats.retriesUsed, attempt - 1);
    }

    this.log({
      level: 'warn',
      plugin: pluginName,
      phase: 'analysis',
      message: `Retry attempt ${attempt}/${maxAttempts}`,
      context: {
        error: { name: 'RetryableError', message: error }
      }
    });
  }

  /**
   * Update plugin statistics based on log entry
   */
  private updatePluginStats(pluginName: string, entry: Omit<PluginLogEntry, 'timestamp'>): void {
    const stats = this.pluginStats.get(pluginName);
    if (!stats) return;

    if (entry.level === 'error') {
      stats.errors++;
    } else if (entry.level === 'warn') {
      stats.warnings++;
    }

    if (entry.context) {
      if (entry.context.itemsProcessed) {
        stats.itemsProcessed += entry.context.itemsProcessed;
      }
      if (entry.context.itemsFound) {
        stats.itemsFound += entry.context.itemsFound;
      }
      if (entry.context.cost) {
        stats.cost += entry.context.cost;
      }
    }
  }

  /**
   * Generate execution summary for all plugins
   */
  generateSummary(): JobLogSummary {
    const now = Date.now();
    const totalDuration = now - this.sessionStartTime;
    
    const pluginSummaries: PluginExecutionSummary[] = [];
    let totalCost = 0;
    let totalComments = 0;
    let totalErrors = 0;
    let totalWarnings = 0;

    // Generate summary for each plugin
    for (const [pluginName, stats] of this.pluginStats.entries()) {
      const startTime = this.pluginStartTimes.get(pluginName) || this.sessionStartTime;
      const pluginEntries = this.entries.filter(e => e.plugin === pluginName);
      const lastEntry = pluginEntries[pluginEntries.length - 1];
      const endTime = lastEntry ? new Date(lastEntry.timestamp).getTime() : now;

      const summary: PluginExecutionSummary = {
        plugin: pluginName,
        status: stats.finalError ? 'failed' : (stats.errors > 0 ? 'partial' : 'success'),
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        duration: endTime - startTime,
        itemsProcessed: stats.itemsProcessed,
        itemsFound: stats.itemsFound,
        commentsGenerated: stats.commentsGenerated,
        cost: stats.cost,
        errors: stats.errors,
        warnings: stats.warnings,
        retriesUsed: stats.retriesUsed,
        finalError: stats.finalError
      };

      pluginSummaries.push(summary);
      totalCost += stats.cost;
      totalComments += stats.commentsGenerated;
      totalErrors += stats.errors;
      totalWarnings += stats.warnings;
    }

    // Identify key issues
    const keyIssues = this.identifyKeyIssues();

    // Determine overall status
    const failedPlugins = pluginSummaries.filter(p => p.status === 'failed').length;
    const partialPlugins = pluginSummaries.filter(p => p.status === 'partial').length;
    
    let overallStatus: 'success' | 'failed' | 'partial' = 'success';
    if (failedPlugins > 0) {
      overallStatus = failedPlugins === pluginSummaries.length ? 'failed' : 'partial';
    } else if (partialPlugins > 0) {
      overallStatus = 'partial';
    }

    return {
      jobId: this.jobId,
      totalDuration,
      totalCost,
      totalChunks: this.getTotalChunksProcessed(),
      totalComments,
      pluginSummaries,
      overallStatus,
      errors: totalErrors,
      warnings: totalWarnings,
      keyIssues
    };
  }

  /**
   * Generate formatted log string for Job.logs field
   */
  generateJobLogString(): string {
    const summary = this.generateSummary();
    
    let logString = `=== Plugin Analysis Summary ===\n`;
    logString += `Duration: ${(summary.totalDuration / 1000).toFixed(1)}s\n`;
    logString += `Total Cost: $${(summary.totalCost / 100).toFixed(4)}\n`;
    logString += `Total Comments: ${summary.totalComments}\n`;
    logString += `Overall Status: ${summary.overallStatus.toUpperCase()}\n`;
    logString += `Errors: ${summary.errors}, Warnings: ${summary.warnings}\n\n`;

    // Plugin summaries
    logString += `=== Plugin Results ===\n`;
    for (const plugin of summary.pluginSummaries) {
      logString += `${plugin.plugin}: ${plugin.status.toUpperCase()}\n`;
      logString += `  Duration: ${(plugin.duration / 1000).toFixed(1)}s\n`;
      logString += `  Comments: ${plugin.commentsGenerated}\n`;
      logString += `  Cost: $${(plugin.cost / 100).toFixed(4)}\n`;
      if (plugin.errors > 0 || plugin.warnings > 0) {
        logString += `  Issues: ${plugin.errors} errors, ${plugin.warnings} warnings\n`;
      }
      if (plugin.retriesUsed > 0) {
        logString += `  Retries: ${plugin.retriesUsed}\n`;
      }
      if (plugin.finalError) {
        logString += `  Error: ${plugin.finalError}\n`;
      }
      logString += `\n`;
    }

    // Key issues
    if (summary.keyIssues.length > 0) {
      logString += `=== Key Issues ===\n`;
      for (const issue of summary.keyIssues) {
        logString += `${issue.plugin}: ${issue.issue} (${issue.count}x)\n`;
        if (issue.example) {
          logString += `  Example: ${issue.example}\n`;
        }
      }
      logString += `\n`;
    }

    // Recent error details (last 10 errors)
    const recentErrors = this.entries
      .filter(e => e.level === 'error')
      .slice(-10);
    
    if (recentErrors.length > 0) {
      logString += `=== Recent Errors ===\n`;
      for (const error of recentErrors) {
        logString += `[${error.timestamp}] ${error.plugin} (${error.phase}): ${error.message}\n`;
        if (error.context?.error) {
          logString += `  ${error.context.error.name}: ${error.context.error.message}\n`;
        }
      }
    }

    return logString;
  }

  /**
   * Get all log entries (for detailed debugging)
   */
  getAllEntries(): PluginLogEntry[] {
    return [...this.entries];
  }

  /**
   * Get entries for a specific plugin
   */
  getEntriesForPlugin(pluginName: string): PluginLogEntry[] {
    return this.entries.filter(e => e.plugin === pluginName);
  }

  private getTotalChunksProcessed(): number {
    // Look for chunking phase entries to determine total chunks
    const chunkingEntries = this.entries.filter(e => e.phase === 'chunking');
    if (chunkingEntries.length > 0) {
      const maxChunks = Math.max(...chunkingEntries.map(e => e.context?.totalChunks || 0));
      return maxChunks;
    }
    return 0;
  }

  private identifyKeyIssues(): Array<{ plugin: string; issue: string; count: number; example?: string }> {
    const issues = new Map<string, { count: number; example?: string }>();

    for (const entry of this.entries) {
      if (entry.level === 'warn' || entry.level === 'error') {
        // Categorize common issues
        let issueType = '';
        if (entry.message.includes('Could not find location')) {
          issueType = 'Location Finding Failed';
        } else if (entry.message.includes('failed permanently')) {
          issueType = 'Plugin Failed Permanently';
        } else if (entry.message.includes('Retry attempt')) {
          issueType = 'Retry Required';
        } else if (entry.message.includes('Cannot read properties')) {
          issueType = 'Null/Undefined Error';
        } else {
          issueType = 'Other Error';
        }

        const key = `${entry.plugin}:${issueType}`;
        const existing = issues.get(key) || { count: 0 };
        existing.count++;
        if (!existing.example) {
          existing.example = entry.message;
        }
        issues.set(key, existing);
      }
    }

    return Array.from(issues.entries())
      .map(([key, data]) => {
        const [plugin, issue] = key.split(':');
        return { plugin, issue, ...data };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 issues
  }
}

/**
 * Plugin-specific logger instance with convenience methods
 */
export class PluginLoggerInstance {
  constructor(
    private parentLogger: PluginLogger,
    private pluginName: string
  ) {}

  debug(message: string, phase: PluginLogEntry['phase'] = 'analysis', context?: PluginLogEntry['context']): void {
    this.parentLogger.log({ level: 'debug', plugin: this.pluginName, phase, message, context });
  }

  info(message: string, phase: PluginLogEntry['phase'] = 'analysis', context?: PluginLogEntry['context']): void {
    this.parentLogger.log({ level: 'info', plugin: this.pluginName, phase, message, context });
  }

  warn(message: string, phase: PluginLogEntry['phase'] = 'analysis', context?: PluginLogEntry['context']): void {
    this.parentLogger.log({ level: 'warn', plugin: this.pluginName, phase, message, context });
  }

  error(message: string, error?: Error | unknown, phase: PluginLogEntry['phase'] = 'analysis', context?: PluginLogEntry['context']): void {
    const errorContext: PluginLogEntry['context'] = { ...context };
    
    if (error instanceof Error) {
      errorContext.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    } else if (error) {
      errorContext.error = {
        name: 'UnknownError',
        message: String(error),
      };
    }

    this.parentLogger.log({ level: 'error', plugin: this.pluginName, phase, message, context: errorContext });
  }

  // Convenience methods for common logging patterns
  startPhase(phase: PluginLogEntry['phase'], message?: string): void {
    this.info(message || `Starting ${phase}`, phase);
  }

  endPhase(phase: PluginLogEntry['phase'], message?: string, context?: PluginLogEntry['context']): void {
    this.info(message || `Completed ${phase}`, phase, context);
  }

  processingChunks(totalChunks: number): void {
    this.info(`Processing ${totalChunks} chunks in parallel`, 'chunking', { totalChunks });
  }

  chunkProcessed(chunkIndex: number, totalChunks: number, itemsFound: number = 0): void {
    this.debug(`Chunk ${chunkIndex + 1}/${totalChunks} processed`, 'analysis', { 
      chunkIndex, 
      totalChunks, 
      itemsFound 
    });
  }

  locationNotFound(text: string, phase: PluginLogEntry['phase'] = 'location_finding'): void {
    this.warn(`Could not find location for text: ${text.substring(0, 100)}${text.length > 100 ? '...' : ''}`, phase);
  }

  itemsExtracted(count: number, phase: PluginLogEntry['phase'] = 'analysis'): void {
    this.info(`Found ${count} items`, phase, { itemsFound: count });
  }

  commentsGenerated(count: number): void {
    this.info(`Generated ${count} comments`, 'comment_generation', { commentsGenerated: count });
  }

  cost(amount: number, phase: PluginLogEntry['phase'] = 'analysis'): void {
    this.debug(`Cost: $${(amount / 100).toFixed(4)}`, phase, { cost: amount });
  }
}