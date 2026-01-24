// Server-side exports that use Node.js built-ins
// These should only be imported in server-side code

// Logger (uses AsyncLocalStorage for job context)
export { logger } from './shared/logger';

// Claude wrapper (uses logger)
export * from './claude/wrapper';

// Document analysis workflows (uses logger)
export * from './workflows';
export type { DocumentAnalysisResult } from './workflows';

// Tools system - full implementations
export * from './tools';

// Bulk operations (YAML-based)
export * from './bulk-operations';

// Analysis plugins (use logger)
export { PluginManager } from './analysis-plugins';
export { ChunkRouter } from './analysis-plugins/utils/ChunkRouter';
export {
  PluginLogger,
  TextChunk,
  CommentBuilder,
  createChunks,
  FactCheckPlugin,
  ForecastPlugin,
  MathPlugin,
  SpellingPlugin
} from './analysis-plugins';

// Job context (uses AsyncLocalStorage)
export {
  initWorkerContext,
  getWorkerId,
  getCurrentJobId,
  runWithJobContext,
  getRemainingTimeMs,
  isJobTimedOut,
  checkJobTimeout,
  JobTimeoutError
} from './shared/jobContext';

// Reasoning budget resolver (full async version with caching)
export {
  resolveReasoningBudget,
  invalidateEndpointsCache,
  invalidateAllEndpointsCache,
} from './utils/reasoningBudget';

// OpenRouter API functions (server-only - require API calls)
export {
  callOpenRouter,
  callOpenRouterChat,
  callOpenRouterWithTool,
} from './utils/openrouter';

// Meta-evaluation system (uses Claude API)
export * from './meta-eval';