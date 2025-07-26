/**
 * Main exports for the plugin-based document analysis system
 */

// Core types
export * from "./types";

// Core classes
export { createChunks, TextChunk } from "./TextChunk";
export { PluginManager } from "./PluginManager";
export type {
  FullDocumentAnalysisResult,
  SimpleDocumentAnalysisResult,
} from "./PluginManager";

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
