// Main analysis function
export { analyzeDocument } from "./analyzeDocument";

// Analysis workflows
export { generateLinkAnalysis } from "./linkAnalysis";
export { analyzeLinkDocument } from "./linkAnalysis/linkAnalysisWorkflow";
export { generateComprehensiveAnalysis } from "./comprehensiveAnalysis";
export { extractHighlightsFromAnalysis } from "./highlightExtraction";

// Utility functions used by external modules
// Note: Legacy functions removed as part of LLMInteraction cleanup
