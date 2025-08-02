// Core AI utilities for RoastMyPost
export * from './claude/wrapper';
export * from './claude/testUtils';
export * from './claude/mockHelpers';
export * from './helicone/api-client';
export * from './helicone/costFetcher';
export * from './helicone/sessionContext';
export { sessionContext } from './helicone/sessionContext';
export * from './helicone/sessions';
export * from './utils/tokenUtils';
export * from './utils/anthropic';
export * from './utils/retryUtils';
export * from './types';

// Tools system
export * from './tools';

// Analysis plugins - excluding conflicting types
export { 
  PluginManager,
  PluginLogger,
  TextChunk,
  StandardCommentBuilder,
  ChunkRouter,
  createChunks,
  FactCheckPlugin,
  ForecastPlugin,
  MathPlugin,
  SpellingPlugin
} from './analysis-plugins';

// Analysis plugin types
export type { Finding } from './analysis-plugins/types';
export type { FullDocumentAnalysisResult } from './analysis-plugins/PluginManager';

// Document and agent types (avoid conflicts with existing exports)
export * from './types/agentSchema';
export type { 
  Document, 
  DocumentsCollection,
  RawDocument, 
  RawDocumentReview,
  RawDocumentsCollection,
  Evaluation,
  transformDocument,
  transformDocumentsCollection
} from './types/documents';
export * from './types/llmSchema';
export {
  DEFAULT_TEMPERATURE,
  COMPREHENSIVE_ANALYSIS_TIMEOUT,
  HIGHLIGHT_EXTRACTION_TIMEOUT,
  SELF_CRITIQUE_TIMEOUT,
  withTimeout
} from './types/openai';

// Shared utilities
export * from './shared/logger';
export type { 
  Comment,
  DocumentLocation,
  LanguageConvention,
  LanguageConventionOption
} from './shared/types';

export {
  DEFAULT_TIMEOUT,
  getRandomElement,
  getPercentile,
  getPercentileNumber,
  countWords
} from './shared/types';