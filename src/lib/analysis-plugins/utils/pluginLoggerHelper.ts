/**
 * Helper utilities for plugins to use the centralized logging system
 */

import type { PluginLoggerInstance } from '../PluginLogger';

/**
 * Helper for plugins that need to process chunks and log progress
 */
export class ChunkProcessor {
  constructor(
    private logger: PluginLoggerInstance,
    private totalChunks: number
  ) {
    this.logger.processingChunks(totalChunks);
  }

  /**
   * Log that a chunk has been processed
   */
  chunkProcessed(chunkIndex: number, itemsFound: number = 0): void {
    this.logger.chunkProcessed(chunkIndex, this.totalChunks, itemsFound);
  }

  /**
   * Log completion of chunk processing
   */
  completed(totalItemsFound: number): void {
    this.logger.itemsExtracted(totalItemsFound, 'analysis');
  }
}

/**
 * Helper for plugins that need to find locations in text
 */
export class LocationFinder {
  constructor(private logger: PluginLoggerInstance) {}

  /**
   * Log that a location could not be found
   */
  locationNotFound(text: string, reason?: string): void {
    const message = reason 
      ? `Could not find location for text: ${text.substring(0, 100)}${text.length > 100 ? '...' : ''} - ${reason}`
      : `Could not find location for text: ${text.substring(0, 100)}${text.length > 100 ? '...' : ''}`;
    
    this.logger.warn(message, 'location_finding');
  }

  /**
   * Log successful location finding
   */
  locationFound(text: string, startOffset: number, endOffset: number): void {
    this.logger.debug(
      `Found location for text: ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}`,
      'location_finding',
      { 
        startOffset, 
        endOffset, 
        textLength: text.length 
      }
    );
  }
}

/**
 * Helper for plugins that generate comments
 */
export class CommentGenerator {
  constructor(private logger: PluginLoggerInstance) {}

  /**
   * Log comment generation
   */
  commentsGenerated(count: number): void {
    this.logger.commentsGenerated(count);
  }

  /**
   * Log failed comment generation
   */
  commentGenerationFailed(error: string, context?: any): void {
    this.logger.error(`Failed to generate comment: ${error}`, undefined, 'comment_generation', { data: context });
  }
}

/**
 * Helper for plugins that make LLM calls
 */
export class LLMCallTracker {
  constructor(private logger: PluginLoggerInstance) {}

  /**
   * Log an LLM call with cost
   */
  llmCall(operation: string, cost: number, tokensUsed?: { input: number; output: number }): void {
    this.logger.info(
      `${operation} - cost: $${(cost / 100).toFixed(4)}`,
      'analysis',
      { 
        cost,
        tokensUsed
      }
    );
  }

  /**
   * Log LLM call failure
   */
  llmCallFailed(operation: string, error: string): void {
    this.logger.error(`LLM call failed for ${operation}: ${error}`, undefined, 'analysis');
  }
}

/**
 * All-in-one plugin helper that provides common logging utilities
 */
export class PluginLoggerHelper {
  public readonly chunkProcessor: ChunkProcessor;
  public readonly locationFinder: LocationFinder;
  public readonly commentGenerator: CommentGenerator;
  public readonly llmCallTracker: LLMCallTracker;

  constructor(
    private logger: PluginLoggerInstance,
    totalChunks: number
  ) {
    this.chunkProcessor = new ChunkProcessor(logger, totalChunks);
    this.locationFinder = new LocationFinder(logger);
    this.commentGenerator = new CommentGenerator(logger);
    this.llmCallTracker = new LLMCallTracker(logger);
  }

  /**
   * Start a plugin phase
   */
  startPhase(phase: 'initialization' | 'chunking' | 'analysis' | 'location_finding' | 'comment_generation' | 'cleanup' | 'summary', message?: string): void {
    this.logger.startPhase(phase, message);
  }

  /**
   * End a plugin phase
   */
  endPhase(phase: 'initialization' | 'chunking' | 'analysis' | 'location_finding' | 'comment_generation' | 'cleanup' | 'summary', message?: string, context?: any): void {
    this.logger.endPhase(phase, message, context);
  }

  /**
   * Log plugin-specific information
   */
  info(message: string, phase?: 'initialization' | 'chunking' | 'analysis' | 'location_finding' | 'comment_generation' | 'cleanup' | 'summary', context?: any): void {
    this.logger.info(message, phase || 'analysis', context);
  }

  /**
   * Log plugin warnings
   */
  warn(message: string, phase?: 'initialization' | 'chunking' | 'analysis' | 'location_finding' | 'comment_generation' | 'cleanup' | 'summary', context?: any): void {
    this.logger.warn(message, phase || 'analysis', context);
  }

  /**
   * Log plugin errors
   */
  error(message: string, error?: Error | unknown, phase?: 'initialization' | 'chunking' | 'analysis' | 'location_finding' | 'comment_generation' | 'cleanup' | 'summary', context?: any): void {
    this.logger.error(message, error, phase || 'analysis', context);
  }

  /**
   * Debug logging
   */
  debug(message: string, phase?: 'initialization' | 'chunking' | 'analysis' | 'location_finding' | 'comment_generation' | 'cleanup' | 'summary', context?: any): void {
    this.logger.debug(message, phase || 'analysis', context);
  }
}