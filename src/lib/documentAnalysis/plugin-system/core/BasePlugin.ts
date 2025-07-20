/**
 * Unified base class for all analysis plugins
 * Combines the best features from both legacy base classes
 */

import { 
  AnalysisPlugin, 
  ChunkResult, 
  LocatedFinding,
  SynthesisResult, 
  RoutingExample, 
  LLMInteraction,
  GenerateCommentsContext,
  PotentialFinding,
  InvestigatedFinding,
  GlobalFinding,
  PluginError,
  HighlightHint
} from '../types';
import { TextChunk } from '../TextChunk';
import type { Comment } from '@/types/documentSchema';
import { estimateTokens } from '../../../tokenUtils';
import { callClaudeWithTool, MODEL_CONFIG } from '../../../claude/wrapper';
import { logger } from '../../../logger';
import { sessionContext } from '../../../helicone/sessionContext';
import { createHeliconeHeaders } from '../../../helicone/sessions';
import { convertFindingToHighlight } from '../utils/findingToHighlight';

export abstract class BasePlugin<TState = any> implements AnalysisPlugin<TState> {
  protected state: TState;
  protected totalCost: number = 0;
  protected llmInteractions: LLMInteraction[] = [];
  protected chunks: Map<string, TextChunk> = new Map();
  protected locatedFindings: LocatedFinding[] = [];  // Old system (deprecated)
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
    this.chunks.clear();
    this.locatedFindings = [];
    this.generatedComments = [];
  }
  
  /**
   * Store a chunk for later reference during synthesis
   */
  protected storeChunk(chunk: TextChunk): void {
    this.chunks.set(chunk.id, chunk);
  }
  
  /**
   * Get a stored chunk by ID
   */
  protected getChunk(chunkId: string): TextChunk | undefined {
    return this.chunks.get(chunkId);
  }

  protected abstract createInitialState(): TState;

  /**
   * Track LLM interactions with automatic cost calculation
   */
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

      this.llmInteractions.push(interaction);
      this.totalCost += this.calculateCost(interaction.tokensUsed);

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

      this.llmInteractions.push(interaction);
      throw error;
    }
  }

  /**
   * Perform extraction using Claude with tool use
   */
  protected async extractWithTool<T>(
    chunk: TextChunk,
    toolName: string,
    toolDescription: string,
    toolSchema: any,
    extractionPrompt?: string
  ): Promise<{ result: T; cost: number }> {
    const prompt = extractionPrompt || this.buildDefaultExtractionPrompt(chunk);
    
    // Get session context if available
    const currentSession = sessionContext.getSession();
    const sessionConfig = currentSession ? 
      sessionContext.withPath(`/plugins/${this.name()}/extract`) : 
      undefined;
    const heliconeHeaders = sessionConfig ? 
      createHeliconeHeaders(sessionConfig) : 
      undefined;

    try {
      const { response, toolResult } = await callClaudeWithTool<T>({
        model: MODEL_CONFIG.analysis,
        max_tokens: 1500,
        temperature: 0,
        system: prompt,
        messages: [
          {
            role: "user",
            content: "Please analyze the provided text using the extraction tool."
          }
        ],
        toolName,
        toolDescription,
        toolSchema,
        heliconeHeaders,
        enablePromptCaching: true
      });

      const cost = this.calculateCostFromUsage(response.usage);
      this.totalCost += cost;
      
      logger.info(`Plugin extraction completed`, {
        plugin: this.name(),
        toolName,
        chunkId: chunk.id,
        tokensUsed: response.usage,
        cost
      });

      // Track the interaction
      this.llmInteractions.push({
        model: MODEL_CONFIG.analysis,
        prompt,
        response: JSON.stringify(toolResult),
        tokensUsed: {
          prompt: response.usage?.input_tokens || 0,
          completion: response.usage?.output_tokens || 0,
          total: (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0)
        },
        timestamp: new Date(),
        duration: 0 // Not tracked in this method
      });

      return { result: toolResult, cost };
    } catch (error) {
      logger.error(`Plugin extraction failed`, {
        plugin: this.name(),
        toolName,
        chunkId: chunk.id,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Build default extraction prompt
   */
  protected buildDefaultExtractionPrompt(chunk: TextChunk): string {
    return `Extract relevant content from this text chunk.

TEXT TO ANALYZE:
${chunk.text}

CRITICAL: You MUST use the extraction tool to report your findings. Do not respond with plain text.`;
  }

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
   * Store findings with location information
   */
  protected addLocatedFindings(findings: LocatedFinding[]): void {
    this.locatedFindings.push(...findings);
  }

  /**
   * Get all located findings
   */
  protected getLocatedFindings(): LocatedFinding[] {
    return this.locatedFindings;
  }
  
  // Legacy methods for backwards compatibility
  protected addChunkFindings(findings: LocatedFinding[]): void {
    this.addLocatedFindings(findings);
  }
  
  protected getChunkFindings(): LocatedFinding[] {
    return this.getLocatedFindings();
  }

  /**
   * Get generated comments
   */
  public getGeneratedComments(): Comment[] {
    return this.generatedComments;
  }

  /**
   * Default implementation of generateComments
   * Plugins should override this to implement their own comment generation
   */
  generateComments(context: GenerateCommentsContext): Comment[] {
    // Default to old system for backwards compatibility
    return this.oldGenerateComments(context);
  }
  
  /**
   * Old generate comments implementation (for backwards compatibility)
   */
  protected oldGenerateComments(context: GenerateCommentsContext): Comment[] {
    const { documentText, maxComments = 50, minImportance = 2 } = context;
    
    logger.debug(`${this.name()}: Generating comments from ${this.locatedFindings.length} located findings`);
    
    // Convert located findings to comments
    const comments: Comment[] = [];
    
    for (const finding of this.locatedFindings) {
      const comment = convertFindingToHighlight(finding, {
        documentText,
        defaultImportance: this.severityToImportance(finding.severity)
      });
      
      if (comment && (comment.importance || 0) >= minImportance) {
        comments.push(comment);
      }
    }
    
    logger.debug(`${this.name()}: Converted ${comments.length} findings to comments`);
    
    // Sort by importance (descending) and take top N
    comments.sort((a, b) => (b.importance || 0) - (a.importance || 0));
    
    const selectedComments = comments.slice(0, maxComments);
    
    // Store the generated comments
    this.generatedComments = selectedComments;
    
    return selectedComments;
  }

  /**
   * Convert severity to importance score (1-10)
   */
  protected severityToImportance(severity: string): number {
    switch (severity) {
      case 'high': return 8;
      case 'medium': return 5;
      case 'low': return 3;
      case 'info': return 2;
      default: return 3;
    }
  }
  
  
}