// Server-side exports that use Node.js built-ins
// These should only be imported in server-side code

// Logger (uses AsyncLocalStorage for job context)
export { logger } from './shared/logger';

// Claude wrapper (uses logger)
export * from './claude/wrapper';

// Document analysis workflows (uses logger)
export * from './workflows';

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
  getCurrentJobId,
  runWithJobId,
  runWithJobIdAsync
} from './shared/jobContext';