/**
 * Base class for analysis plugins
 */

import { AnalysisPlugin, ChunkResult, SynthesisResult, RoutingExample, LLMInteraction } from './types';
import { TextChunk } from './TextChunk';
import { estimateTokens } from '../../tokenUtils';

export abstract class BasePlugin<TState = any> implements AnalysisPlugin<TState> {
  protected state: TState;

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
    // Subclasses should override if they need custom clearing logic
    this.state = this.createInitialState();
  }

  protected abstract createInitialState(): TState;

  // Helper method to track LLM interactions
  protected async trackLLMCall<T>(
    model: string,
    prompt: string,
    llmCall: () => Promise<T>
  ): Promise<{ result: T; interaction: LLMInteraction }> {
    const startTime = Date.now();

    try {
      const result = await llmCall();
      const duration = Date.now() - startTime;

      const promptTokens = estimateTokens(prompt);
      const responseText = JSON.stringify(result);
      const completionTokens = estimateTokens(responseText);
      
      const interaction: LLMInteraction = {
        model,
        prompt,
        response: responseText,
        tokensUsed: {
          prompt: promptTokens,
          completion: completionTokens,
          total: promptTokens + completionTokens
        },
        timestamp: new Date(),
        duration
      };

      return { result, interaction };
    } catch (error) {
      const duration = Date.now() - startTime;
      const interaction: LLMInteraction = {
        model,
        prompt,
        response: `Error: ${error}`,
        tokensUsed: {
          prompt: estimateTokens(prompt),
          completion: 0,
          total: estimateTokens(prompt)
        },
        timestamp: new Date(),
        duration
      };

      throw error;
    }
  }
}