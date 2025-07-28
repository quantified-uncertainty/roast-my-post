/**
 * Plugin execution context that plugins can use for logging and shared utilities
 */

import type { PluginLoggerInstance } from './PluginLogger';
import type { TextChunk } from './TextChunk';

export interface PluginContext {
  /** Plugin-specific logger instance for structured logging */
  logger: PluginLoggerInstance;
  
  /** Document text being analyzed */
  documentText: string;
  
  /** Chunks being processed */
  chunks: TextChunk[];
  
  /** Plugin-specific configuration */
  config?: Record<string, any>;
}

/**
 * Enhanced plugin interface that receives a context object with logging
 */
export interface ContextAwareAnalysisPlugin {
  name(): string;
  analyze(context: PluginContext): Promise<{
    comments: import('@/types/documentSchema').Comment[];
    summary: string;
    analysis?: string;
    cost: number;
    llmInteractions: import('@/types/llm').LLMInteraction[];
  }>;
}

/**
 * Adapter to wrap existing SimpleAnalysisPlugin to use PluginContext
 */
export class PluginContextAdapter {
  constructor(
    private plugin: import('./types').SimpleAnalysisPlugin,
    private context: PluginContext
  ) {}

  async analyze(): Promise<{
    comments: import('@/types/documentSchema').Comment[];
    summary: string;
    analysis?: string;
    cost: number;
  }> {
    const { logger } = this.context;
    
    try {
      logger.startPhase('initialization');
      logger.processingChunks(this.context.chunks.length);
      
      const result = await this.plugin.analyze(this.context.chunks, this.context.documentText);
      
      logger.itemsExtracted(result.comments.length);
      logger.commentsGenerated(result.comments.length);
      logger.cost(result.cost);
      logger.endPhase('summary', `Generated ${result.comments.length} comments`);
      
      return result;
    } catch (error) {
      logger.error(
        `Plugin ${this.plugin.name()} failed during analysis`, 
        error, 
        'analysis'
      );
      throw error;
    }
  }
}