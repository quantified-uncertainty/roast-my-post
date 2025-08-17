/**
 * Plugin Executor - Handles the execution of individual plugins
 * 
 * Separated from PluginManager to handle execution logic, retries, and timeouts.
 */

import { SimpleAnalysisPlugin, AnalysisResult } from "../types";
import { TextChunk } from "../TextChunk";
import { PluginLogger } from "../PluginLogger";
import { logger } from "../../shared/logger";

export interface ExecutionConfig {
  maxRetries?: number;
  timeoutMs?: number;
  retryDelayMs?: number;
}

export interface ExecutionResult {
  pluginName: string;
  result: AnalysisResult;
  success: boolean;
  attempts: number;
  duration: number;
  error?: Error;
}

/**
 * Handles plugin execution with retries and timeouts
 */
export class PluginExecutor {
  private defaultConfig: Required<ExecutionConfig> = {
    maxRetries: 2,
    timeoutMs: 300000, // 5 minutes
    retryDelayMs: 1000,
  };

  constructor(
    private pluginLogger: PluginLogger,
    config?: Partial<ExecutionConfig>
  ) {
    if (config) {
      this.defaultConfig = { ...this.defaultConfig, ...config };
    }
  }

  /**
   * Execute a single plugin with retries and timeout
   */
  async execute(
    plugin: SimpleAnalysisPlugin,
    chunks: TextChunk[],
    documentText: string,
    config?: ExecutionConfig
  ): Promise<ExecutionResult> {
    const execConfig = { ...this.defaultConfig, ...config };
    const pluginName = plugin.name();
    const startTime = Date.now();
    
    let lastError: Error | undefined;
    let attempts = 0;

    // Start plugin logging
    this.pluginLogger.pluginStarted(pluginName);
    const pluginLoggerInstance = this.pluginLogger.createPluginLogger(pluginName);

    for (attempts = 1; attempts <= execConfig.maxRetries; attempts++) {
      try {
        // Log retry if not first attempt
        if (attempts > 1) {
          this.pluginLogger.pluginRetried(
            pluginName,
            attempts,
            execConfig.maxRetries,
            lastError?.message || 'Unknown error'
          );
          
          // Wait before retry
          await this.delay(execConfig.retryDelayMs * attempts);
        }

        // Log execution start
        pluginLoggerInstance.startPhase(
          'analysis',
          `Starting ${pluginName} analysis (attempt ${attempts}/${execConfig.maxRetries})`
        );
        pluginLoggerInstance.processingChunks(chunks.length);

        // Execute with timeout
        const result = await this.executeWithTimeout(
          plugin,
          chunks,
          documentText,
          execConfig.timeoutMs
        );

        // Log success
        pluginLoggerInstance.itemsExtracted(result.comments.length);
        pluginLoggerInstance.commentsGenerated(result.comments.length);
        pluginLoggerInstance.cost(result.cost);
        pluginLoggerInstance.endPhase(
          'analysis',
          `Completed successfully - ${result.comments.length} comments`
        );

        // Plugin completed successfully
        this.pluginLogger.pluginCompleted(pluginName, {
          itemsFound: result.comments.length,
          commentsGenerated: result.comments.length,
          cost: result.cost,
        });

        return {
          pluginName,
          result,
          success: true,
          attempts,
          duration: Date.now() - startTime,
        };

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        logger.error(`Plugin ${pluginName} failed (attempt ${attempts}/${execConfig.maxRetries})`, error);
        
        // Log the error
        pluginLoggerInstance.endPhase(
          'analysis',
          `Failed: ${lastError.message}`
        );

        // If this was the last attempt, record failure
        if (attempts === execConfig.maxRetries) {
          this.pluginLogger.pluginCompleted(pluginName, {
            error: lastError.message,
          });
        }
      }
    }

    // All retries exhausted
    const duration = Date.now() - startTime;
    
    return {
      pluginName,
      result: {
        summary: `Plugin failed after ${attempts} attempts: ${lastError?.message}`,
        analysis: '',
        comments: [],
        cost: 0,
      },
      success: false,
      attempts,
      duration,
      error: lastError,
    };
  }

  /**
   * Execute multiple plugins in parallel
   */
  async executeMany(
    executions: Array<{
      plugin: SimpleAnalysisPlugin;
      chunks: TextChunk[];
    }>,
    documentText: string,
    config?: ExecutionConfig
  ): Promise<ExecutionResult[]> {
    const promises = executions.map(({ plugin, chunks }) =>
      this.execute(plugin, chunks, documentText, config)
    );

    return Promise.all(promises);
  }

  /**
   * Execute a plugin with timeout
   */
  private async executeWithTimeout(
    plugin: SimpleAnalysisPlugin,
    chunks: TextChunk[],
    documentText: string,
    timeoutMs: number
  ): Promise<AnalysisResult> {
    let timeoutId: NodeJS.Timeout;

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error(`Plugin ${plugin.name()} timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    try {
      // Race between plugin execution and timeout
      const result = await Promise.race([
        plugin.analyze(chunks, documentText),
        timeoutPromise,
      ]);

      return result;
    } finally {
      // Always clear the timeout
      clearTimeout(timeoutId!);
    }
  }

  /**
   * Delay helper for retries
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get default configuration
   */
  getConfig(): Required<ExecutionConfig> {
    return { ...this.defaultConfig };
  }

  /**
   * Update default configuration
   */
  updateConfig(config: Partial<ExecutionConfig>): void {
    this.defaultConfig = { ...this.defaultConfig, ...config };
  }
}