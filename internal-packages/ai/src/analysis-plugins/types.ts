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


import type { Comment } from '../shared/types';

// LLM-related types for analysis plugins
export interface LLMMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface LLMUsage {
  prompt_tokens: number;
  completion_tokens: number;  
  total_tokens: number;
  input_tokens: number;
  output_tokens: number;
}

// Local LLMInteraction type for analysis plugins
export interface LLMInteraction {
  messages: LLMMessage[];
  usage: LLMUsage;
}

export interface RoutingExample {
  chunkText: string;
  shouldProcess: boolean;
  reason?: string;
}

// Simplified Plugin API
export interface AnalysisResult {
  summary: string;
  analysis: string;
  comments: Comment[];
  cost: number;
  grade?: number; // Optional grade (0-100) for quality assessment
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
}

// Plugin constructor interface with static properties
export interface PluginConstructor {
  new (): SimpleAnalysisPlugin;
  
  // Static property to indicate if plugin should bypass routing
  // If true, plugin will receive all chunks regardless of routing decisions
  readonly alwaysRun?: boolean;
}