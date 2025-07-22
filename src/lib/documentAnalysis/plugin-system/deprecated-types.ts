/**
 * DEPRECATED: Legacy plugin system types
 * 
 * These interfaces are maintained for backward compatibility only.
 * For new plugins, use SimpleAnalysisPlugin from './types' instead.
 * 
 * The legacy system used a three-phase approach (processChunk, synthesize, generateComments)
 * which has been replaced with a single analyze() method in the new system.
 * 
 * Migration guide:
 * - Replace AnalysisPlugin with SimpleAnalysisPlugin
 * - Combine processChunk/synthesize/generateComments logic into a single analyze() method
 * - Use the new finding system (PotentialFinding, InvestigatedFinding, etc.) for better location tracking
 */

import type { LLMInteraction } from '@/types/llm';
import type { Comment } from '@/types/documentSchema';
import type { TextChunk, Finding, RoutingExample } from './types';

/**
 * @deprecated Use 'scanChunk' | 'investigate' | 'synthesize' | 'comment' instead
 */
export type LegacyPhase = 'processChunk' | 'synthesize' | 'generateComments';

export interface PluginError {
  timestamp: Date;
  /**
   * @deprecated The phase naming has changed. Use the new phase types instead.
   */
  phase: LegacyPhase;
  error: string;
  context?: Record<string, unknown>;
}

export interface ChunkResult {
  findings?: Finding[];
  llmCalls: LLMInteraction[];
  metadata?: {
    tokensUsed: number;
    processingTime: number;
    confidence?: number;
  };
}

export interface SynthesisResult {
  summary: string;
  analysisSummary: string;  // Markdown summary of patterns and insights
  recommendations?: string[];
  llmCalls: LLMInteraction[];
  visualizations?: Array<{
    type: string;
    data: unknown;
    config?: Record<string, unknown>;
  }>;
}

export interface GenerateCommentsContext {
  documentText: string;
  maxComments?: number;
  minImportance?: number;
}

export interface PluginResult {
  summary: string;
  comments: Comment[];
  analysisSummary: string;
  llmCalls: LLMInteraction[];
}

/**
 * @deprecated Use SimpleAnalysisPlugin for new plugins
 * 
 * Legacy plugin interface that uses a three-phase approach:
 * 1. processChunk - Analyze individual chunks
 * 2. synthesize - Combine chunk findings
 * 3. generateComments - Create final comments
 * 
 * This has been replaced with a single analyze() method in SimpleAnalysisPlugin
 * which is simpler and more flexible.
 */
export interface AnalysisPlugin<TState = unknown> {
  // Identity
  name(): string;
  
  // Natural language description for routing
  promptForWhenToUse(): string;
  
  // Optional: examples to improve routing accuracy
  routingExamples?(): RoutingExample[];
  
  // Processing methods (legacy)
  processChunk(chunk: TextChunk): Promise<ChunkResult>;
  synthesize(): Promise<SynthesisResult>;
  
  // Comment generation (legacy)
  generateComments?(context: GenerateCommentsContext): Comment[];
  
  // State management
  getState(): TState;
  clearState(): void;
}