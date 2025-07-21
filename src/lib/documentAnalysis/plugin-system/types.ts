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

export interface PotentialFinding {
  id: string;
  type: string;
  data: any;  // Plugin knows what this is
  highlightHint: HighlightHint;
}

export interface InvestigatedFinding {
  id: string;
  type: string;
  data: any;
  severity: 'low' | 'medium' | 'high' | 'info';
  message: string;
  highlightHint: HighlightHint;
}

export interface GlobalFinding {
  id: string;
  type: string;
  data: any;
  severity: 'low' | 'medium' | 'high' | 'info';
  message: string;
  reason: string;  // Why this is global (e.g., "Cross-document pattern")
}

export interface PluginError {
  timestamp: Date;
  phase: 'processChunk' | 'synthesize' | 'generateComments';
  error: string;
  context?: any;
}

// Re-export from shared types to avoid duplication
import type { RichLLMInteraction } from '@/types/llm';
import type { Comment } from '@/types/documentSchema';
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
  analysisSummary: string;  // Markdown summary of patterns and insights
  recommendations?: string[];
  llmCalls: LLMInteraction[];
  visualizations?: any[];
}

export interface RoutingExample {
  chunkText: string;
  shouldProcess: boolean;
  reason?: string;
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

// Legacy plugin interface - use SimpleAnalysisPlugin for new plugins
export interface AnalysisPlugin<TState = any> {
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
  getDebugInfo?(): any;
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