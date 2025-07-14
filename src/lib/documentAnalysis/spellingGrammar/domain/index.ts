/**
 * Domain layer exports
 * Immutable value objects representing core business concepts
 */

export * from './errors';
export * from './document';

// Re-export types that will remain as interfaces
export type {
  SpellingGrammarHighlight,
  TokenUsage,
  ChunkAnalysisResult
} from '../types';