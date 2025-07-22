/**
 * SimpleBasePlugin - Base class for plugins using the new SimpleAnalysisPlugin interface
 * 
 * This is the recommended base class for simple plugins that don't need
 * the complex 5-stage pipeline pattern. It provides:
 * - Built-in cost tracking
 * - LLM interaction storage
 * - Debug information support
 * - Simplified state management
 * 
 * For plugins that need the 5-stage pipeline pattern, use PipelinePlugin instead.
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

import { 
  RoutingExample, 
  LLMInteraction,
  SimpleAnalysisPlugin,
  AnalysisResult
} from '../types';
import { TextChunk } from '../TextChunk';
import type { Comment } from '@/types/documentSchema';

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
   * Get all LLM interactions from this plugin
   */
  getLLMInteractions(): LLMInteraction[] {
    return this.llmInteractions;
  }

  /**
   * Get debug information (can be overridden by plugins)
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
   * Track an LLM call and accumulate cost/interactions
   * This is a helper method for plugins to use
   */
  protected async trackLLMCall<T extends { cost?: number; llmInteractions?: LLMInteraction[] }>(
    operation: () => Promise<T>
  ): Promise<T> {
    const result = await operation();
    
    if (result.llmInteractions) {
      this.llmInteractions.push(...result.llmInteractions);
    }
    
    if (typeof result.cost === 'number') {
      this.totalCost += result.cost;
    }
    
    return result;
  }

  /**
   * Set debug information
   */
  protected setDebugInfo(info: Record<string, unknown>): void {
    this.debugInfo = { ...this.debugInfo, ...info };
  }
}