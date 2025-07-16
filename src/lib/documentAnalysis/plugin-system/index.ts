/**
 * Main exports for the plugin-based document analysis system
 */

// Core types
export * from './types';

// Core classes
export { TextChunk, createChunks } from './TextChunk';
export { RoutingPlan } from './RoutingPlan';
export { BasePlugin } from './BasePlugin';
export { PromptBasedRouter } from './PromptBasedRouter';
export { PluginManager } from './PluginManager';
export type { DocumentAnalysisResult } from './PluginManager';

// Built-in plugins
export * from './plugins';