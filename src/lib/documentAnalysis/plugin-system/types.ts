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

// Finding with guaranteed location information
export interface LocatedFinding extends Omit<Finding, 'locationHint'> {
  locationHint: {
    lineNumber: number;        // Always required
    lineText: string;          // Always required
    matchText: string;         // Always required
    startLineNumber?: number;  // For multi-line findings
    endLineNumber?: number;    // For multi-line findings
  };
}

export type ChunkFinding = LocatedFinding;

// New finding system types
export interface HighlightHint {
  searchText: string;      // The text to search for
  lineNumber?: number;     // Optional line number hint
  chunkId: string;         // Which chunk this came from
}

// Base interface for finding data
export interface FindingData {
  [key: string]: unknown;
}

export interface PotentialFinding {
  id: string;
  type: string;
  data: FindingData;
  highlightHint: HighlightHint;
}

export interface InvestigatedFinding {
  id: string;
  type: string;
  data: FindingData;
  severity: 'low' | 'medium' | 'high' | 'info';
  message: string;
  highlightHint: HighlightHint;
}

export interface GlobalFinding {
  id: string;
  type: string;
  data: FindingData;
  severity: 'low' | 'medium' | 'high' | 'info';
  message: string;
  reason: string;  // Why this is global (e.g., "Cross-document pattern")
}

// Note: PluginError with legacy phase types has been moved to deprecated-types.ts
// For new error tracking, use the modern phase types: 'scanChunk' | 'investigate' | 'synthesize' | 'comment'

// Re-export from shared types to avoid duplication
import type { LLMInteraction as BaseLLMInteraction } from '@/types/llm';
import type { Comment } from '@/types/documentSchema';
export type LLMInteraction = BaseLLMInteraction;

export interface RoutingExample {
  chunkText: string;
  shouldProcess: boolean;
  reason?: string;
}

// Note: ChunkResult, SynthesisResult, GenerateCommentsContext, and PluginResult
// have been moved to deprecated-types.ts as they are part of the legacy plugin system

// Note: The legacy AnalysisPlugin interface has been moved to deprecated-types.ts
// Please use SimpleAnalysisPlugin below for all new plugin implementations.
// The new interface uses a single analyze() method instead of the three-phase approach.

// New simplified Plugin API
export interface AnalysisResult {
  summary: string;
  analysis: string;
  comments: Comment[];
  llmInteractions: LLMInteraction[];
  cost: number;
}

export interface SimpleAnalysisPlugin {
  // Metadata
  name(): string;
  promptForWhenToUse(): string;
  routingExamples?(): RoutingExample[];
  
  // Core workflow - single method that handles everything
  analyze(chunks: TextChunk[], documentText: string): Promise<AnalysisResult>;
  
  // For testing/debugging - expose internal state
  getDebugInfo?(): Record<string, unknown>;
  getCost(): number;
  getLLMInteractions(): LLMInteraction[];
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