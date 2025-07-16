/**
 * Enhanced base plugin with shared utilities to reduce code duplication
 */

import { BasePlugin } from './BasePlugin';
import { ChunkResult, SynthesisResult, Finding, RoutingExample } from './types';
import { TextChunk } from './TextChunk';
import { PromptBuilder, FindingGenerator, PluginLLMUtils, SchemaBuilder } from './shared/PluginUtilities';

/**
 * Configuration for enhanced plugins
 */
export interface PluginConfig {
  domain: string;
  taskDescription: string;
  examples?: string[];
  extractionProperties?: Record<string, any>;
  synthesisType?: string;
  errorCategories?: Record<string, string[]>;
  severityMap?: Record<string, 'low' | 'medium' | 'high'>;
}

/**
 * Enhanced base plugin that provides common functionality
 */
export abstract class EnhancedBasePlugin<TState> extends BasePlugin<TState> {
  protected promptBuilder: PromptBuilder;
  protected config: PluginConfig;
  protected totalCost: number = 0;

  constructor(initialState: TState, config: PluginConfig) {
    super(initialState);
    this.config = config;
    this.promptBuilder = new PromptBuilder(
      config.domain,
      config.taskDescription,
      config.examples || []
    );
  }

  /**
   * Standard extraction implementation that most plugins can use
   */
  protected async performStandardExtraction<T>(
    chunk: TextChunk,
    toolName: string,
    additionalProperties: Record<string, any> = {}
  ): Promise<{ items: T[]; cost: number }> {
    const extractionPrompt = this.promptBuilder.buildExtractionPrompt(chunk);
    const toolDescription = `Extract ${this.config.domain} content from the provided text`;
    const toolSchema = SchemaBuilder.extractionSchema(
      this.config.domain,
      { ...this.config.extractionProperties, ...additionalProperties }
    );

    const { result, cost } = await PluginLLMUtils.extractWithTool<{ items: T[] }>(
      extractionPrompt,
      toolName,
      toolDescription,
      toolSchema,
      chunk.id
    );

    this.totalCost += cost;
    return { items: result.items || [], cost };
  }

  /**
   * Standard synthesis implementation that most plugins can use
   */
  protected async performStandardSynthesis<T>(
    items: any[],
    toolName: string
  ): Promise<{ result: T; cost: number }> {
    const synthesisPrompt = this.promptBuilder.buildSynthesisPrompt(
      items,
      this.config.synthesisType || 'general analysis'
    );
    const toolDescription = `Synthesize ${this.config.domain} findings into comprehensive analysis`;
    const toolSchema = SchemaBuilder.synthesisSchema(this.config.domain);

    const { result, cost } = await PluginLLMUtils.synthesizeWithTool<T>(
      synthesisPrompt,
      toolName,
      toolDescription,
      toolSchema,
      items.length
    );

    this.totalCost += cost;
    return { result, cost };
  }

  /**
   * Standard error finding creation
   */
  protected createErrorFinding(
    text: string,
    description: string,
    chunkId: string,
    severity?: 'low' | 'medium' | 'high'
  ): Finding {
    return FindingGenerator.createErrorFinding(text, description, chunkId, severity);
  }

  /**
   * Standard verification finding creation
   */
  protected createVerificationFinding(
    item: any,
    isValid: boolean,
    reasoning: string,
    chunkId: string
  ): Finding {
    return FindingGenerator.createVerificationFinding(item, isValid, reasoning, chunkId);
  }

  /**
   * Standard recommendation finding creation
   */
  protected createRecommendationFinding(
    recommendation: string,
    context: string,
    severity?: 'low' | 'medium' | 'high'
  ): Finding {
    return FindingGenerator.createRecommendationFinding(recommendation, context, severity);
  }

  /**
   * Get total cost for this plugin's operations
   */
  public getTotalCost(): number {
    return this.totalCost;
  }

  /**
   * Reset cost tracking
   */
  public resetCost(): void {
    this.totalCost = 0;
  }

  /**
   * Helper method for categorizing errors if the plugin has error categories configured
   */
  protected categorizeError(description: string): string {
    if (!this.config.errorCategories) {
      return 'unknown';
    }
    
    const lowerDesc = description.toLowerCase();
    for (const [category, keywords] of Object.entries(this.config.errorCategories)) {
      if (keywords.some(keyword => lowerDesc.includes(keyword))) {
        return category;
      }
    }
    return 'unknown';
  }

  /**
   * Helper method for determining severity if the plugin has severity mapping configured
   */
  protected determineSeverity(errorType: string, description: string): 'low' | 'medium' | 'high' {
    if (this.config.severityMap && this.config.severityMap[errorType]) {
      return this.config.severityMap[errorType];
    }

    // Default severity logic
    const lowerDesc = description.toLowerCase();
    if (lowerDesc.includes('critical') || lowerDesc.includes('major') || lowerDesc.includes('wrong')) {
      return 'high';
    }
    if (lowerDesc.includes('minor') || lowerDesc.includes('style') || lowerDesc.includes('suggestion')) {
      return 'low';
    }
    return 'medium';
  }

  /**
   * Standard state management utilities
   */
  protected addToState<K extends keyof TState>(
    key: K,
    items: TState[K] extends Array<infer U> ? U[] : never
  ): void {
    if (Array.isArray(this.state[key])) {
      (this.state[key] as any[]).push(...items);
    }
  }

  protected clearStateArray<K extends keyof TState>(key: K): void {
    if (Array.isArray(this.state[key])) {
      (this.state[key] as any[]).length = 0;
    }
  }

  protected getStateArrayCount<K extends keyof TState>(key: K): number {
    if (Array.isArray(this.state[key])) {
      return (this.state[key] as any[]).length;
    }
    return 0;
  }
}