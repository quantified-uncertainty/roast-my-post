/**
 * Types for spelling and grammar analysis
 */

/**
 * A chunk of document content with line number information
 */
export interface ChunkWithLineNumbers {
  /** The text content of the chunk */
  content: string;
  /** The starting line number (1-based) in the original document */
  startLineNumber: number;
  /** Array of individual lines in the chunk */
  lines: string[];
}

/**
 * A spelling or grammar highlight returned by the LLM
 */
export interface SpellingGrammarHighlight {
  /** Starting line number (1-based) where the error begins */
  lineStart: number;
  /** Ending line number (1-based) where the error ends */
  lineEnd: number;
  /** The exact text that contains the error */
  highlightedText: string;
  /** Clear explanation of the error and suggested correction */
  description: string;
}

/**
 * Agent information needed for analysis
 */
export interface AgentContext {
  /** Name of the agent */
  agentName: string;
  /** Primary instructions for the agent */
  primaryInstructions: string;
  /** Detected document conventions (optional) */
  conventions?: {
    language: 'US' | 'UK' | 'mixed' | 'unknown';
    documentType: 'academic' | 'blog' | 'technical' | 'casual' | 'unknown';
    formality: 'formal' | 'informal' | 'mixed';
  };
}