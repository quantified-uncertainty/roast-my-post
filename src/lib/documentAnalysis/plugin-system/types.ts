/**
 * Core types for the plugin-based document analysis system
 */

export interface TextChunk {
  id: string;
  text: string;
  metadata?: {
    section?: string;
    pageNumber?: number;
    position: {
      start: number;
      end: number;
    };
    lineInfo?: {
      startLine: number; // 1-based line number
      endLine: number; // 1-based line number
      totalLines: number; // Number of lines in the chunk
    };
  };
  
  // Helper methods
  getContext(position: number, windowSize?: number): string;
  getTextBefore(length: number): string;
  getTextAfter(length: number): string;
  getLineNumber(charOffset: number): number | null; // Get line number for a character offset within the chunk
}

export interface Finding {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'info';
  message: string;
  location?: {
    start: number;
    end: number;
  };
  locationHint?: {
    lineNumber?: number; // 1-based line number
    lineText?: string; // The actual line text for context
    matchText?: string; // The specific text that was found
    startLineNumber?: number; // For multi-line findings
    endLineNumber?: number; // For multi-line findings
  };
  metadata?: Record<string, any>;
}

// Re-export from shared types to avoid duplication
import type { RichLLMInteraction } from '@/types/llm';
export type LLMInteraction = RichLLMInteraction;

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
  findings: Finding[];
  recommendations?: string[];
  llmCalls: LLMInteraction[];
  visualizations?: any[];
}

export interface RoutingExample {
  chunkText: string;
  shouldProcess: boolean;
  reason?: string;
}

export interface AnalysisPlugin<TState = any> {
  // Identity
  name(): string;
  
  // Natural language description for routing
  promptForWhenToUse(): string;
  
  // Optional: examples to improve routing accuracy
  routingExamples?(): RoutingExample[];
  
  // Processing methods
  processChunk(chunk: TextChunk): Promise<ChunkResult>;
  synthesize(): Promise<SynthesisResult>;
  
  // State management
  getState(): TState;
  clearState(): void;
}

export interface RoutingDecision {
  chunkId: string;
  plugins: string[];
}

export interface RoutingPlan {
  decisions: Map<string, string[]>;
  
  addRouting(chunkId: string, plugins: string[]): void;
  getPluginsForChunk(chunkId: string): string[];
  getAllChunks(): string[];
  getStats(): {
    totalChunks: number;
    totalRoutings: number;
    pluginUsage: Map<string, number>;
  };
}

export interface DocumentProfile {
  documentType?: string;
  topics?: string[];
  language?: string;
  sections?: string[];
  hasFormulas?: boolean;
  hasCitations?: boolean;
  estimatedComplexity?: 'low' | 'medium' | 'high';
}