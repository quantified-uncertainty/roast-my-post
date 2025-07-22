/**
 * Main exports for the plugin-based document analysis system
 */

// Core types
export * from "./types";

// Core classes
export { createChunks, TextChunk } from "./TextChunk";
export { BasePlugin } from "./core/BasePlugin";
export { PluginManager } from "./PluginManager";
export type { SimpleDocumentAnalysisResult, FullDocumentAnalysisResult } from "./PluginManager";

// Mixins
export * from "./mixins/LocationTracking";

// Builders
export * from "./builders/FindingBuilder";
export * from "./builders/SchemaBuilder";
export * from "./builders/PromptBuilder";

// Analyzers
export * from "./analyzers/ErrorPatternAnalyzer";

// Built-in plugins
export * from "./plugins";

// Utilities
export * from "./utils/findingToHighlight";
