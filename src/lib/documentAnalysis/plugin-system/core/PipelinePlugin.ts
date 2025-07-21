/**
 * PipelinePlugin - Base class for plugins using the 5-stage pipeline pattern
 * 
 * This class extracts the common pipeline logic used by all modern plugins:
 * 1. Extract - Process chunks with LLM to extract potential findings
 * 2. Investigate - Add severity and messages to findings  
 * 3. Locate - Find findings in document text with position information
 * 4. Analyze - Generate summaries and identify patterns
 * 5. Generate - Create UI comments from located findings
 * 
 * Usage:
 * ```typescript
 * export class MyPlugin extends PipelinePlugin<MyFindingStorage> {
 *   name(): string { return "MY_PLUGIN"; }
 *   
 *   promptForWhenToUse(): string {
 *     return "Use this plugin when...";
 *   }
 *   
 *   protected createInitialFindingStorage(): MyFindingStorage {
 *     return { potential: [], investigated: [], located: [] };
 *   }
 *   
 *   protected async extractFromChunk(chunk: TextChunk): Promise<void> {
 *     // Your extraction logic here
 *   }
 *   
 *   protected investigateFindings(): void {
 *     // Your investigation logic here
 *   }
 *   
 *   // ... implement other abstract methods
 * }
 * ```
 */

import type { Comment } from '@/types/documentSchema';
import { logger } from '../../../../logger';
import { BasePlugin } from './BasePlugin';
import { TextChunk } from '../TextChunk';
import {
  RoutingExample,
  SimpleAnalysisPlugin,
  AnalysisResult,
  LLMInteraction,
} from '../types';

/**
 * Base interface for finding storage used by pipeline plugins
 */
export interface PipelineFindingStorage<
  TPotential = any,
  TInvestigated = any,
  TLocated = any
> {
  potential: TPotential[];
  investigated: TInvestigated[];
  located: TLocated[];
  summary?: string;
  analysisSummary?: string;
}

/**
 * Options for the location stage
 */
export interface LocationOptions {
  allowFuzzy?: boolean;
  mathSpecific?: boolean;
  fallbackToContext?: boolean;
  allowPartialMatch?: boolean;
  normalizeQuotes?: boolean;
}

/**
 * Abstract base class implementing the common 5-stage pipeline pattern
 */
export abstract class PipelinePlugin<TFindingStorage extends PipelineFindingStorage>
  extends BasePlugin<{}>
  implements SimpleAnalysisPlugin
{
  protected findings: TFindingStorage;
  protected analysisInteractions: LLMInteraction[] = [];

  constructor() {
    super({});
    this.findings = this.createInitialFindingStorage();
  }

  // Abstract methods that plugins must implement
  abstract name(): string;
  abstract promptForWhenToUse(): string;
  
  /**
   * Create the initial finding storage structure
   */
  protected abstract createInitialFindingStorage(): TFindingStorage;

  /**
   * Extract findings from a single chunk
   * This is where the plugin-specific LLM extraction happens
   */
  protected abstract extractFromChunk(chunk: TextChunk): Promise<void>;

  /**
   * Investigate findings to add severity and messages
   * Convert potential findings to investigated findings
   */
  protected abstract investigateFindings(): void;

  /**
   * Locate findings in the document text
   * Convert investigated findings to located findings with position info
   */
  protected abstract locateFindings(documentText: string): void;

  /**
   * Analyze findings to generate summaries and identify patterns
   * This updates findings.summary and findings.analysisSummary
   */
  protected abstract analyzeFindingPatterns(): void;

  /**
   * Generate UI comments from located findings
   */
  protected abstract generateComments(documentText: string): Comment[];

  // Optional methods with sensible defaults
  routingExamples?(): RoutingExample[] {
    return [];
  }

  /**
   * Main analysis method implementing the 5-stage pipeline
   */
  async analyze(chunks: TextChunk[], documentText: string): Promise<AnalysisResult> {
    // Clear any previous state
    this.clearState();
    
    logger.info(`${this.name()}: Starting 5-stage pipeline analysis`);
    
    // Stage 1: Extract from all chunks
    logger.debug(`${this.name()}: Stage 1 - Extracting from ${chunks.length} chunks`);
    for (const chunk of chunks) {
      await this.extractFromChunk(chunk);
    }
    logger.debug(`${this.name()}: Stage 1 complete - ${this.findings.potential.length} potential findings`);
    
    // Stage 2: Investigate findings
    logger.debug(`${this.name()}: Stage 2 - Investigating findings`);
    this.investigateFindings();
    logger.debug(`${this.name()}: Stage 2 complete - ${this.findings.investigated.length} investigated findings`);
    
    // Stage 3: Locate findings in document
    logger.debug(`${this.name()}: Stage 3 - Locating findings in document`);
    this.locateFindings(documentText);
    logger.debug(`${this.name()}: Stage 3 complete - ${this.findings.located.length} located findings`);
    
    // Stage 4: Analyze patterns
    logger.debug(`${this.name()}: Stage 4 - Analyzing patterns`);
    this.analyzeFindingPatterns();
    logger.debug(`${this.name()}: Stage 4 complete - generated summary and analysis`);
    
    // Stage 5: Generate comments
    logger.debug(`${this.name()}: Stage 5 - Generating comments`);
    const comments = this.generateComments(documentText);
    logger.debug(`${this.name()}: Stage 5 complete - ${comments.length} comments generated`);
    
    logger.info(`${this.name()}: Pipeline analysis complete - ${comments.length} total comments`);
    
    return {
      summary: this.findings.summary || "",
      analysis: this.findings.analysisSummary || "",
      comments,
      llmInteractions: this.analysisInteractions,
      cost: this.getTotalCost()
    };
  }

  /**
   * Get total cost incurred by this plugin
   */
  getCost(): number {
    return this.getTotalCost();
  }

  /**
   * Get debug information for testing and introspection
   */
  getDebugInfo(): Record<string, unknown> {
    return {
      findings: this.findings,
      stats: {
        potentialCount: this.findings.potential.length,
        investigatedCount: this.findings.investigated.length,
        locatedCount: this.findings.located.length,
      },
      stageResults: {
        extracted: this.findings.potential,
        investigated: this.findings.investigated,
        located: this.findings.located,
        analysis: {
          summary: this.findings.summary,
          analysisSummary: this.findings.analysisSummary
        }
      },
      interactions: this.analysisInteractions,
      cost: this.getTotalCost()
    };
  }

  /**
   * Helper method to track LLM calls with automatic cost and interaction storage
   */
  protected async trackLLMCall<T extends { interaction: LLMInteraction; cost: number }>(
    llmCall: () => Promise<T>
  ): Promise<T> {
    const result = await llmCall();
    
    if (result.interaction) {
      this.analysisInteractions.push(result.interaction);
    }
    
    if (typeof result.cost === 'number') {
      this.totalCost += result.cost;
    }
    
    return result;
  }

  /**
   * Helper method to get line number at a specific position in text
   */
  protected getLineNumberAtPosition(text: string, position: number): number {
    return text.slice(0, position).split('\n').length;
  }

  /**
   * Helper method to get the line text at a specific position
   */
  protected getLineAtPosition(text: string, position: number): string {
    const lines = text.split('\n');
    const lineNumber = this.getLineNumberAtPosition(text, position);
    return lines[lineNumber - 1] || '';
  }

  /**
   * Helper method to capitalize first letter of a string
   */
  protected capitalizeFirst(str: string): string {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Create initial state (required by BasePlugin)
   */
  protected createInitialState(): {} {
    return {};
  }

  /**
   * Clear all state including findings and interactions
   */
  override clearState(): void {
    super.clearState();
    this.findings = this.createInitialFindingStorage();
    this.analysisInteractions = [];
  }

  // Legacy methods - throw errors to prevent accidental use
  async processChunk(): Promise<any> {
    throw new Error(`${this.name()}: Use analyze() method instead of processChunk()`);
  }

  async synthesize(): Promise<any> {
    throw new Error(`${this.name()}: Use analyze() method instead of synthesize()`);
  }
}