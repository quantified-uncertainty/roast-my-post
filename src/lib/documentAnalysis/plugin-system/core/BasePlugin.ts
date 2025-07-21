/**
 * Unified base class for all analysis plugins
 * 
 * MIGRATION NOTES:
 * ================
 * This class is transitioning to a more functional approach. New plugins should:
 * 
 * 1. Use extractWithTool from utils/extractionHelper instead of this.extractWithTool()
 * 2. Manage their own finding storage (see MathPlugin.findings for example)
 * 3. Implement custom generateComments() logic instead of relying on oldGenerateComments()
 * 4. Avoid using deprecated methods marked with @deprecated
 * 
 * RECOMMENDED PATTERN (see MathPlugin for full example):
 * =====================================================
 * 
 * class MyPlugin extends BasePlugin<{}> {
 *   private findings: MyFindingStorage = { ... };
 *   
 *   async processChunk(chunk: TextChunk): Promise<ChunkResult> {
 *     // Use functional extraction helper
 *     const extraction = await extractWithTool<MyResult>(chunk, config);
 *     this.llmInteractions.push(extraction.interaction);
 *     this.totalCost += extraction.cost;
 *     // Store in plugin-specific state
 *     this.findings.potential.push(...conversion(extraction.result));
 *     return { ... };
 *   }
 *   
 *   generateComments(context: GenerateCommentsContext): Comment[] {
 *     // Custom pipeline logic
 *     return myCommentGeneration(this.findings, context);
 *   }
 * }
 */

import { 
  AnalysisPlugin, 
  ChunkResult, 
  SynthesisResult, 
  RoutingExample, 
  LLMInteraction,
  GenerateCommentsContext
} from '../types';
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
  protected calculateCostFromUsage(usage: any): number {
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