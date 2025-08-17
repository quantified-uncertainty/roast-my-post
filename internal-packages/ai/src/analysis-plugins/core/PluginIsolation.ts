/**
 * Plugin Isolation - Ensures each plugin execution has its own isolated context
 * 
 * This provides basic state isolation to prevent plugins from interfering with each other
 * when running concurrently or sequentially.
 */

import { SimpleAnalysisPlugin, AnalysisResult } from "../types";
import { TextChunk } from "../TextChunk";
import { logger } from "../../shared/logger";
import { type PluginId } from "../constants/plugin-ids";

/**
 * Context that gets created fresh for each plugin execution
 */
export interface PluginContext {
  executionId: string;
  startTime: number;
  metadata: Map<string, unknown>;
}

/**
 * Factory for creating plugin instances with isolated context
 */
export class PluginFactory {
  private pluginConstructors: Map<PluginId, new () => SimpleAnalysisPlugin> = new Map();

  /**
   * Register a plugin constructor
   */
  register(id: PluginId, PluginClass: new () => SimpleAnalysisPlugin): void {
    this.pluginConstructors.set(id, PluginClass);
  }

  /**
   * Create a fresh plugin instance
   * This ensures each execution gets a new instance with no shared state
   */
  createInstance(id: PluginId): SimpleAnalysisPlugin | null {
    const PluginClass = this.pluginConstructors.get(id);
    if (!PluginClass) {
      logger.warn(`Plugin ${id} not registered in factory`);
      return null;
    }

    // Create a new instance - this ensures no state is shared
    return new PluginClass();
  }

  /**
   * Get all registered plugin IDs
   */
  getRegisteredPlugins(): PluginId[] {
    return Array.from(this.pluginConstructors.keys());
  }
}

/**
 * Executes plugins in isolation
 */
export class IsolatedPluginExecutor {
  private factory: PluginFactory;
  private executionCounter = 0;

  constructor(factory: PluginFactory) {
    this.factory = factory;
  }

  /**
   * Execute a plugin with a fresh instance and isolated context
   */
  async execute(
    pluginId: PluginId,
    chunks: TextChunk[],
    documentText: string
  ): Promise<{ result: AnalysisResult; context: PluginContext }> {
    // Create unique execution context
    const context: PluginContext = {
      executionId: `${pluginId}-${Date.now()}-${++this.executionCounter}`,
      startTime: Date.now(),
      metadata: new Map(),
    };

    logger.info(`Creating isolated execution ${context.executionId}`);

    // Get a fresh plugin instance
    const plugin = this.factory.createInstance(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found in factory`);
    }

    try {
      // Execute the plugin
      const result = await plugin.analyze(chunks, documentText);
      
      // Record execution time
      const duration = Date.now() - context.startTime;
      context.metadata.set('duration', duration);
      context.metadata.set('success', true);

      logger.info(`Completed isolated execution ${context.executionId} in ${duration}ms`);

      return { result, context };
    } catch (error) {
      // Record error in context
      context.metadata.set('success', false);
      context.metadata.set('error', error instanceof Error ? error.message : String(error));
      
      logger.error(`Failed isolated execution ${context.executionId}`, error);
      throw error;
    }
  }

  /**
   * Execute multiple plugins in parallel with isolation
   */
  async executeMany(
    plugins: Array<{ id: PluginId; chunks: TextChunk[] }>,
    documentText: string
  ): Promise<Map<PluginId, { result: AnalysisResult; context: PluginContext }>> {
    const results = new Map<PluginId, { result: AnalysisResult; context: PluginContext }>();

    // Execute all plugins in parallel, each with their own isolated instance
    const executions = plugins.map(async ({ id, chunks }) => {
      try {
        const execution = await this.execute(id, chunks, documentText);
        return { id, execution };
      } catch (error) {
        logger.error(`Plugin ${id} failed during parallel execution`, error);
        // Return error result instead of throwing
        return {
          id,
          execution: {
            result: {
              summary: `Plugin ${id} failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
              analysis: '',
              comments: [],
              cost: 0,
            },
            context: {
              executionId: `${id}-failed-${Date.now()}`,
              startTime: Date.now(),
              metadata: new Map([['error', error instanceof Error ? error.message : String(error)]]),
            },
          },
        };
      }
    });

    const completed = await Promise.all(executions);
    
    for (const { id, execution } of completed) {
      results.set(id, execution);
    }

    return results;
  }
}

/**
 * Wrapper that ensures plugin cleanup after execution
 */
export class CleanupWrapper {
  private activeExecutions = new Set<string>();

  /**
   * Wrap plugin execution with cleanup
   */
  async withCleanup<T>(
    executionId: string,
    operation: () => Promise<T>
  ): Promise<T> {
    this.activeExecutions.add(executionId);
    
    try {
      return await operation();
    } finally {
      // Always cleanup, even if operation fails
      this.activeExecutions.delete(executionId);
      
      // Force garbage collection hint (won't actually force GC but helps)
      if (global.gc && this.activeExecutions.size === 0) {
        logger.debug('Hinting garbage collection after all executions complete');
        // Note: This only works if Node is run with --expose-gc flag
        // It's a hint, not a guarantee
      }
    }
  }

  /**
   * Get number of active executions
   */
  getActiveCount(): number {
    return this.activeExecutions.size;
  }

  /**
   * Check if an execution is active
   */
  isActive(executionId: string): boolean {
    return this.activeExecutions.has(executionId);
  }
}