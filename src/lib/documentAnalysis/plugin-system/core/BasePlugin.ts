/**
 * Base classes for document analysis plugins
 * 
 * This file provides two base classes:
 * 
 * 1. BasePlugin - The original base class for plugins that use the three-phase approach
 *    (processChunk -> synthesize -> generateComments). Use this for complex plugins
 *    that need fine control over chunk processing and synthesis.
 * 
 * 2. SimpleBasePlugin - A simplified base class for plugins that implement the
 *    SimpleAnalysisPlugin interface. Use this for straightforward plugins that
 *    process all chunks in one go and don't need separate synthesis phases.
 * 
 * Choose SimpleBasePlugin when:
 * - Your plugin processes chunks independently
 * - You don't need complex state management between chunks
 * - You want built-in cost tracking and LLM interaction storage
 * - You prefer a simpler, more linear workflow
 * 
 * Choose BasePlugin when:
 * - You need complex multi-phase processing
 * - You need to maintain intricate state between chunk processing
 * - You're maintaining backwards compatibility with existing plugins
 */

import { 
  RoutingExample, 
  LLMInteraction,
  SimpleAnalysisPlugin,
  AnalysisResult
} from '../types';
import { 
  AnalysisPlugin, 
  ChunkResult, 
  SynthesisResult, 
  GenerateCommentsContext
} from '../deprecated-types';
import { TextChunk } from '../TextChunk';
import type { Comment } from '@/types/documentSchema';
import { estimateTokens } from '../../../tokenUtils';
import { callClaudeWithTool, MODEL_CONFIG } from '../../../claude/wrapper';
import { logger } from '../../../logger';
import { sessionContext } from '../../../helicone/sessionContext';
import { createHeliconeHeaders } from '../../../helicone/sessions';

export abstract class BasePlugin<TState = any> implements AnalysisPlugin<TState> {
  protected state: TState;
  protected totalCost: number = 0;
  protected llmInteractions: LLMInteraction[] = [];
  protected generatedComments: Comment[] = [];

  constructor(initialState: TState) {
    this.state = initialState;
  }

  abstract name(): string;
  abstract promptForWhenToUse(): string;

  // Optional routing examples
  routingExamples?(): RoutingExample[] {
    return [];
  }

  abstract processChunk(chunk: TextChunk): Promise<ChunkResult>;
  abstract synthesize(): Promise<SynthesisResult>;

  getState(): TState {
    return this.state;
  }

  clearState(): void {
    this.state = this.createInitialState();
    this.totalCost = 0;
    this.llmInteractions = [];
    this.generatedComments = [];
  }
  

  protected abstract createInitialState(): TState;



  /**
   * Calculate cost based on token usage
   */
  protected calculateCost(tokensUsed: { prompt: number; completion: number }): number {
    // Claude 3 Sonnet pricing as of 2024
    const inputCost = tokensUsed.prompt * 0.000003;  // $3 per 1M input tokens
    const outputCost = tokensUsed.completion * 0.000015; // $15 per 1M output tokens
    return inputCost + outputCost;
  }

  /**
   * Calculate cost from API usage response
   */
  protected calculateCostFromUsage(usage: { input_tokens?: number; output_tokens?: number } | undefined): number {
    if (!usage) return 0;
    return this.calculateCost({
      prompt: usage.input_tokens || 0,
      completion: usage.output_tokens || 0
    });
  }

  /**
   * Get total cost for this plugin's operations
   */
  public getTotalCost(): number {
    return this.totalCost;
  }

  /**
   * Get all LLM interactions
   */
  public getLLMInteractions(): LLMInteraction[] {
    return this.llmInteractions;
  }

  /**
   * State management helpers
   */
  protected addToStateArray<K extends keyof TState>(
    key: K,
    items: TState[K] extends Array<infer U> ? U[] : never
  ): void {
    if (Array.isArray(this.state[key])) {
      (this.state[key] as any[]).push(...items);
    }
  }

  protected getStateArrayCount<K extends keyof TState>(key: K): number {
    if (Array.isArray(this.state[key])) {
      return (this.state[key] as any[]).length;
    }
    return 0;
  }


  /**
   * Get generated comments
   */
  public getGeneratedComments(): Comment[] {
    return this.generatedComments;
  }

  /**
   * Default implementation of generateComments
   * Plugins MUST override this to implement their own comment generation
   */
  generateComments(context: GenerateCommentsContext): Comment[] {
    throw new Error(`Plugin ${this.name()} must implement generateComments() method`);
  }

}

/**
 * Simplified base class for plugins using the SimpleAnalysisPlugin interface
 * 
 * This class provides:
 * - Built-in cost tracking
 * - LLM interaction storage
 * - Debug information support
 * - Simplified state management
 * 
 * Example usage:
 * ```typescript
 * export class MyPlugin extends SimpleBasePlugin {
 *   name(): string { return "MY_PLUGIN"; }
 *   
 *   promptForWhenToUse(): string {
 *     return "Use this plugin when...";
 *   }
 *   
 *   async analyze(chunks: TextChunk[], documentText: string): Promise<AnalysisResult> {
 *     // Clear any previous state
 *     this.clearState();
 *     
 *     // Process chunks (using this.trackLLMCall for automatic cost/interaction tracking)
 *     for (const chunk of chunks) {
 *       const result = await this.trackLLMCall(async () => {
 *         // Your LLM call here
 *       });
 *     }
 *     
 *     // Return results
 *     return {
 *       summary: "Summary of findings",
 *       analysis: "Detailed analysis",
 *       comments: this.generateComments(documentText),
 *       llmInteractions: this.getLLMInteractions(),
 *       cost: this.getCost()
 *     };
 *   }
 * }
 * ```
 */
export abstract class SimpleBasePlugin implements SimpleAnalysisPlugin {
  protected totalCost: number = 0;
  protected llmInteractions: LLMInteraction[] = [];
  private debugInfo: Record<string, any> = {};

  // Required abstract methods
  abstract name(): string;
  abstract promptForWhenToUse(): string;
  abstract analyze(chunks: TextChunk[], documentText: string): Promise<AnalysisResult>;

  // Optional routing examples
  routingExamples?(): RoutingExample[] {
    return [];
  }

  /**
   * Get total cost incurred by this plugin
   */
  getCost(): number {
    return this.totalCost;
  }

  /**
   * Get all LLM interactions
   */
  getLLMInteractions(): LLMInteraction[] {
    return this.llmInteractions;
  }

  /**
   * Get debug information (for testing and development)
   */
  getDebugInfo?(): Record<string, unknown> {
    return this.debugInfo;
  }

  /**
   * Clear all state (cost, interactions, debug info)
   */
  protected clearState(): void {
    this.totalCost = 0;
    this.llmInteractions = [];
    this.debugInfo = {};
  }

  /**
   * Track an LLM call with automatic cost calculation and interaction storage
   * 
   * @param llmCall - Async function that makes the LLM call and returns the result
   * @returns The result from the LLM call
   * 
   * Example:
   * ```typescript
   * const extraction = await this.trackLLMCall(async () => {
   *   return await extractWithTool(chunk, config);
   * });
   * ```
   */
  protected async trackLLMCall<T extends { interaction: LLMInteraction; cost: number }>(
    llmCall: () => Promise<T>
  ): Promise<T> {
    const result = await llmCall();
    
    if (result.interaction) {
      this.llmInteractions.push(result.interaction);
    }
    
    if (typeof result.cost === 'number') {
      this.totalCost += result.cost;
    }
    
    return result;
  }

  /**
   * Add or update debug information
   * 
   * @param key - Debug info key
   * @param value - Debug info value
   */
  protected setDebugInfo(key: string, value: unknown): void {
    this.debugInfo[key] = value;
  }

  /**
   * Merge debug information
   * 
   * @param info - Object to merge into debug info
   */
  protected mergeDebugInfo(info: Record<string, any>): void {
    this.debugInfo = { ...this.debugInfo, ...info };
  }

  /**
   * Helper method to generate comments from findings
   * Subclasses should implement their own comment generation logic
   * 
   * @param documentText - The full document text
   * @returns Array of comments
   */
  protected abstract generateComments(documentText: string): Comment[];

  /**
   * Calculate cost based on token usage
   * (Same as BasePlugin for consistency)
   */
  protected calculateCost(tokensUsed: { prompt: number; completion: number }): number {
    // Claude 3 Sonnet pricing as of 2024
    const inputCost = tokensUsed.prompt * 0.000003;  // $3 per 1M input tokens
    const outputCost = tokensUsed.completion * 0.000015; // $15 per 1M output tokens
    return inputCost + outputCost;
  }

  /**
   * Calculate cost from API usage response
   * (Same as BasePlugin for consistency)
   */
  protected calculateCostFromUsage(usage: { input_tokens?: number; output_tokens?: number } | undefined): number {
    if (!usage) return 0;
    return this.calculateCost({
      prompt: usage.input_tokens || 0,
      completion: usage.output_tokens || 0
    });
  }
}