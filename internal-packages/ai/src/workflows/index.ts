/**
 * Export all document analysis workflows
 */

// Main analysis function
export { analyzeDocument } from "./documentAnalysis/analyzeDocument";

// Analysis workflows
export { analyzeLinkDocument } from "./documentAnalysis/linkAnalysis";
export { generateComprehensiveAnalysis } from "./documentAnalysis/comprehensiveAnalysis";
export { extractHighlightsFromAnalysis } from "./documentAnalysis/highlightExtraction";
export { analyzeSpellingGrammar } from "./documentAnalysis/spellingGrammar";
export { analyzeWithMultiEpistemicEval } from "./documentAnalysis/multiEpistemicEval";
export { generateSelfCritique } from "./documentAnalysis/selfCritique";

// Export types
export type { TaskResult } from "./documentAnalysis/shared/types";