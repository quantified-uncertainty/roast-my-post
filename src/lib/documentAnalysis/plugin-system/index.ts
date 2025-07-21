/**
 * Main exports for the plugin-based document analysis system
 */

// Core types
export * from "./types";

// Deprecated types (for backward compatibility)
export * from "./deprecated-types";

// Core classes
export { createChunks, TextChunk } from "./TextChunk";
export { RoutingPlan } from "./RoutingPlan";
export { BasePlugin } from "./core/BasePlugin";
export { PromptBasedRouter } from "./PromptBasedRouter";
export { PluginManager } from "./PluginManager";
export type { DocumentAnalysisResult, SimpleDocumentAnalysisResult } from "./PluginManager";

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
