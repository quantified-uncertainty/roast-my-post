/**
 * Export all document analysis workflows
 */

// Main analysis function
export { analyzeDocument } from "./documentAnalysis/analyzeDocument";

// Analysis workflows
export { generateComprehensiveAnalysis } from "./documentAnalysis/comprehensiveAnalysis";
export { extractHighlightsFromAnalysis } from "./documentAnalysis/highlightExtraction";
export { analyzeWithMultiEpistemicEval } from "./documentAnalysis/multiEpistemicEval";
export { generateSelfCritique } from "./documentAnalysis/selfCritique";

// Export types
export type { TaskResult } from "./documentAnalysis/shared/types";