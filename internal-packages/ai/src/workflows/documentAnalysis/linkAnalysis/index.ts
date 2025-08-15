/**
 * Link Analysis workflow - now powered by the plugin architecture
 * 
 * This module exports compatibility functions that use the LinkAnalysisPlugin
 * under the hood, maintaining backward compatibility with existing code.
 */

export { generateLinkAnalysis } from './pluginWrapper';
export { analyzeLinkDocument } from './pluginWrapper';